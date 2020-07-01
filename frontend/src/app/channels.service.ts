import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";
import {State} from "./store";
import {Store} from "@ngrx/store";
import {
  CHANNEL_CLOSED_MESSAGE_TYPE, ChannelClosedMessage,
  CLIENT_BINARY_EXCHANGE_MESSAGE_TYPE,
  clientBinaryExchangeMessage,
  ClientBinaryExchangeMessage,
  CONNECT_TO_CHANNEL_RESULT_MESSAGE_TYPE,
  connectToChannelMessage,
  ConnectToChannelResultCode,
  ConnectToChannelResultMessage,
  CREATE_CHANNEL_RESULT_MESSAGE_TYPE,
  createChannelMessage,
  CreateChannelResultCode,
  CreateChannelResultMessage,
  Message,
  PING_MESSAGE
} from "../../../commands";
import {
  channelClosed,
  channelCreated,
  channelCreationFailed,
  connected,
  connectionFailed,
  cryptoData, newUnreadMessage
} from "./store/channels/channels.actions";
import {addIncomingMessage, addSystemMessage} from "./store/messages/messages.actions";
import {selectChannelByName} from "./store/channels/channels.selectors";
import {take} from "rxjs/operators";
import {ec as EC} from "elliptic";
import * as hash from "hash.js";
import {ChannelState} from "./store/channels/channels.model";
import {ModeOfOperation, utils, padding} from "aes-js";
import * as b64 from "byte-base64";
import utf8 = utils.utf8;
import pkcs7 = padding.pkcs7;

@Injectable({
  providedIn: 'root'
})
export class ChannelsService {

  socket: WebSocket;
  private pingTimeoutId?: number = null;
  private connected = false;
  private ec = new EC("curve25519");
  private keypairs = new Map<string, EC.KeyPair>();
  private sharedKeys = new Map<string, number[]>();

  constructor(private store: Store<State>) {
  }

  connect() {
    this.createSocket();
  }

  private createSocket() {
    this.socket = new WebSocket(environment.config.wssAddress);
    this.connected = true;
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onclose = (ev) => {
      this.connected = false;
      // TODO: dispatch appropriate message
      //handler.handleClosing(ev);
    }
    this.pingTimeoutId = <number><unknown>setTimeout(() => {
      this.pingTimeoutId = null;
      this.sendToServer(PING_MESSAGE)
    }, 5 * 60 * 1000);
  }

  private sendToServer(message: any) {
    if (!this.connected) return;
    this.socket.send(JSON.stringify(message));
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId);
    }
    this.pingTimeoutId = <number><unknown>setTimeout(() => {
      this.pingTimeoutId = null;
      this.sendToServer(PING_MESSAGE)
    }, 5 * 60 * 1000);
  }

  private async handleMessage(ev: MessageEvent) {
    let message = <Message>JSON.parse(ev.data);
    switch (message.type) {
      case CREATE_CHANNEL_RESULT_MESSAGE_TYPE: {
        let result = <CreateChannelResultMessage>message;
        switch (result.code) {
          case CreateChannelResultCode.CHANNEL_CREATED:
            this.store.dispatch(channelCreated({channelName: result.channelName}));
            this.store.dispatch(addSystemMessage({
              channelName: result.channelName,
              content: "Waiting for someone to join..."
            }));
            break;

          case CreateChannelResultCode.CHANNEL_NAME_ALREADY_TAKEN:
            this.store.dispatch(channelCreationFailed({channelName: result.channelName, reason: "nameAlreadyTaken"}));
            break;

          case CreateChannelResultCode.SOMETHING_WENT_WRONG:
            this.store.dispatch(channelCreationFailed({channelName: result.channelName, reason: "somethingWentWrong"}));
            break;
        }
      }
        break;

      case CONNECT_TO_CHANNEL_RESULT_MESSAGE_TYPE: {
        let result = <ConnectToChannelResultMessage>message;
        switch (result.code) {
          case ConnectToChannelResultCode.CONNECTED:
            const chan = await this.store.select(selectChannelByName(result.channelName)).pipe(take(1)).toPromise();
            if (chan.state !== ChannelState.Connecting && chan.state !== ChannelState.Created) {
              console.log(`Got a CONNECTED message, but channel ${chan.name} is already connected. Ignoring the message.`);
              return;
            }
            const keypair = this.ec.genKeyPair();
            this.keypairs.set(result.channelName, keypair);
            this.sendToServer(clientBinaryExchangeMessage(chan.name, keypair.getPublic().encodeCompressed("hex"), true));
            this.store.dispatch(connected({channelName: result.channelName}));
            this.store.dispatch(addSystemMessage({channelName: result.channelName, content: "Connected..."}));
            this.store.dispatch(addSystemMessage({
              channelName: result.channelName,
              content: "ECDH key exchange initiated, waiting for public key from second party..."
            }));
            break;

          case ConnectToChannelResultCode.WRONG_CHANNEL:
            this.store.dispatch(connectionFailed({channelName: result.channelName, reason: "wrongChannel"}));
            break;

          case ConnectToChannelResultCode.SOMETHING_WENT_WRONG:
            this.store.dispatch(connectionFailed({channelName: result.channelName, reason: "somethingWentWrong"}));
            break;
        }
        break;
      }

      case CLIENT_BINARY_EXCHANGE_MESSAGE_TYPE: {
        let result = <ClientBinaryExchangeMessage>message;
        const chan = await this.store.select(selectChannelByName(result.channelName)).pipe(take(1)).toPromise();
        if (result.ecdh) {
          if (chan.state !== ChannelState.Ecdh) {
            console.log(`Got an ECDH message, but the ${chan.name} channel already has a shared key. Ignoring the message`);
            return;
          }
          const otherKey = this.ec.keyFromPublic(result.binaryContent, "hex");
          let keypair = this.keypairs.get(result.channelName);
          const derivedKey = keypair.derive(otherKey.getPublic());
          const sharedKey = hash.sha256().update(derivedKey.toString(16)).digest();
          const localPubKey = keypair.getPublic().encodeCompressed("hex");
          const fingerprint = hash.sha1().update(
            localPubKey <= result.binaryContent ? localPubKey + result.binaryContent : result.binaryContent + localPubKey)
            .digest("hex").substr(0, 5);
          this.store.dispatch(cryptoData({
            channelName: result.channelName,
            fingerprint: fingerprint,
            localPubKey: localPubKey,
            remotePubKey: result.binaryContent
          }));
          this.store.dispatch(addSystemMessage({channelName: chan.name, content: "ECDH complete, channel is now secure!" }));
          this.store.dispatch(addSystemMessage({channelName: chan.name, content: `Channel fingerprint: ${fingerprint}`}));
          this.keypairs.delete(result.channelName);
          this.sharedKeys.set(chan.name, sharedKey);
        } else {
          const [ivB, cipherTextB] = result.binaryContent.split('|', 2);
          const iv = b64.base64ToBytes(ivB)
          const cipherText = b64.base64ToBytes(cipherTextB);
          let aesCbc = new ModeOfOperation.cbc(this.sharedKeys.get(chan.name), iv);
          const decryptedBytes = pkcs7.strip(aesCbc.decrypt(cipherText));
          let msg = utf8.fromBytes(decryptedBytes);
          this.store.dispatch(addIncomingMessage({channelName: result.channelName, content: msg}));
          this.store.dispatch(newUnreadMessage({channelName: result.channelName}));
        }
        break;
      }

      case CHANNEL_CLOSED_MESSAGE_TYPE:
        let result = <ChannelClosedMessage>message;
        this.store.dispatch(channelClosed({channelName: result.channelName}));
        this.store.dispatch(addSystemMessage({channelName: result.channelName, content: "Channel closed"}));
        break;
    }
  }

  public createChannel(channelName: string) {
    this.sendToServer(createChannelMessage(channelName));
  }

  public connectToChannel(channelName: string) {
    this.sendToServer(connectToChannelMessage(channelName));
  }

  public async sendMessage(channelName: string, message: string) {
    const chan = await this.store.select(selectChannelByName(channelName)).pipe(take(1)).toPromise();
    let textBytes = utf8.toBytes(message);
    let iv = new Uint8Array(16);
    crypto.getRandomValues(iv);
    let aesCbc = new ModeOfOperation.cbc(this.sharedKeys.get(chan.name), iv);
    let cipherText = aesCbc.encrypt(pkcs7.pad(textBytes));
    let msg = `${b64.bytesToBase64(iv)}|${b64.bytesToBase64(cipherText)}`
    this.sendToServer(clientBinaryExchangeMessage(channelName, msg));
  }
}

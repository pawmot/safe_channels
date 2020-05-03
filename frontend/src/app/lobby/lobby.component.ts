import {Component, NgZone, OnInit} from '@angular/core';
import {ec as EC} from "elliptic"
import * as hash from "hash.js"
import {Counter, ModeOfOperation, utils} from "aes-js";
import {Store} from "@ngrx/store";
import {selectAppState, State} from "../reducers";
import {connectToChannel, createChannel} from "../reducers/actions";
import {ChannelsService} from "../channels.service";
import {ChannelState} from "../reducers/model/Channel";
import hex = utils.hex;
import utf8 = utils.utf8;

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit {
  channelName: string;
  lines: Line[] = [];
  state: ChannelState = ChannelState.ENTRY;
  error?: string;
  message: string = "";
  creatorPubKey: string;
  connecteePubKey: string
  fingerprint: string;
  private key: EC.KeyPair;
  private ec: EC;
  private sharedKey: number[];
  private isChannelCreator: boolean;

  constructor(private store: Store<State>, private channelsService: ChannelsService, private zone: NgZone) {
    store.select(selectAppState).subscribe(state => {
      this.error = state.errorCode;
      if (state.channel) {
        this.isChannelCreator = state.channel.isChannelCreator;
        this.state = state.channel.state;
        if (this.state === ChannelState.OPEN) {
          if (this.isChannelCreator) {
            this.lines.push(new Line("Waiting for someone to join..."))
          } else {
            this.lines.push(new Line("Connected..."))
            this.initiateEcdh();
            this.state = ChannelState.ECDH;
          }
        }
      }
    })
  }

  ngOnInit(): void {
    this.ec = new EC("curve25519");
    this.key = this.ec.genKeyPair();
    this.channelsService.connect({
      handleMessage: this.handle.bind(this),
      handleClosing: this.handleClosingSocket.bind(this)
    })
  }

  connect() {
    this.store.dispatch(connectToChannel({channelName: this.channelName}));
  }

  create() {
    this.store.dispatch(createChannel({channelName: this.channelName}));
  }

  private handleClosingSocket() {
    this.lines = [];
    this.error = null;
    this.channelName = "";
    this.message = "";
    this.state = ChannelState.ENTRY;
  }

  private handle(ev: MessageEvent) {
    switch (this.state) {
      case ChannelState.OPEN:
        this.handleMessageInOpenState(ev);
        break;

      case ChannelState.ECDH:
        this.handleMessageInEcdhState(ev);
        break;

      case ChannelState.CONNECTED:
        this.handleMessageInConnectedState(ev)
        break;
    }
  }

  handleMessageInOpenState(ev: MessageEvent) {
    this.initiateEcdh();
    this.state = ChannelState.ECDH;
  }

  handleMessageInEcdhState(ev: MessageEvent) {
    const cmd = <Command>JSON.parse(ev.data);
    switch (cmd.action) {
      case "message" :
        const msg = <MessageCommand>cmd;
        if (msg.type === MessageType.ECDH) {
          const derivedKey = this.key.derive(this.ec.keyFromPublic(msg.encodedMsg, "hex").getPublic());
          this.sharedKey = hash.sha256().update(derivedKey.toString(16)).digest();
          this.lines.push(new Line("ECDH complete, channel is now secure!"));
          this.error = null;
          this.computeFingerprint(msg.encodedMsg);
          this.lines.push(new Line(`Channel fingerprint: ${this.fingerprint}`));
          this.state = ChannelState.CONNECTED;
        } else {
          this.error = "Got an unexpected non-ECDH message";
        }
        break;

      case "closeChannel":
        this.lines = [];
        this.error = null;
        this.channelName = "";
        this.message = "";
        this.state = ChannelState.ENTRY;
    }
  }

  handleMessageInConnectedState(ev: MessageEvent) {
    const cmd = <Command>JSON.parse(ev.data);
    switch (cmd.action) {
      case "message" :
        const msg = <MessageCommand>cmd;
        if (msg.type === MessageType.Regular) {
          this.error = null;
          this.lines.push(new Line("<<< " + this.decrypt(msg.encodedMsg)));
        } else {
          this.error = "Got an unexpected non-Regular message";
        }
        break;

      case "closeChannel":
        this.lines = [];
        this.error = null;
        this.channelName = "";
        this.message = "";
        this.state = ChannelState.ENTRY;
    }
  }

  sendMessage() {
    this.lines.push(new Line(`>>> ${this.message}`));
    const cipherText = this.encrypt(this.message);
    this.message = "";
    this.channelsService.sendToServer(new MessageCommand(this.channelName, MessageType.Regular, cipherText));
  }

  private encrypt(plaintext: string): string {
    let textBytes = utf8.toBytes(plaintext);
    let aesCtr = new ModeOfOperation.ctr(this.sharedKey, new Counter(5))
    let cipherText = aesCtr.encrypt(textBytes);
    return hex.fromBytes(cipherText); // TODO: change to base64, hex is wasteful.
  }

  private decrypt(cipherTextHex: string): string {
    const cipherText = hex.toBytes(cipherTextHex);
    let aesCtr = new ModeOfOperation.ctr(this.sharedKey, new Counter(5))
    const decryptedBytes = aesCtr.decrypt(cipherText);
    return utf8.fromBytes(decryptedBytes);
  }

  private initiateEcdh() {
    const pubkey = this.key.getPublic().encodeCompressed("hex");
    this.channelsService.sendToServer(new MessageCommand(this.channelName, MessageType.ECDH, pubkey));
    this.lines.push(new Line("Initiated ECDH, waiting for public key from second party..."));
  }

  private computeFingerprint(otherPubKey: string) {
    const selfPubKey = this.key.getPublic().encodeCompressed("hex");
    if (this.isChannelCreator) {
      this.creatorPubKey = selfPubKey;
      this.connecteePubKey = otherPubKey;
    } else {
      this.creatorPubKey = otherPubKey;
      this.connecteePubKey = selfPubKey;
    }

    this.fingerprint = hash.sha1().update(this.creatorPubKey + this.connecteePubKey).digest("hex").substr(0, 5);
  }

}

class Line {
  constructor(public text: string) {
  }
}

class MessageCommand implements Command {
  constructor(public channelName: string, public type: MessageType, public encodedMsg: string) {
  }

  action: "message" = "message";
}

class CloseChannelCommand implements Command {
  constructor(public channelName: string) {
  }

  action: "closeChannel" = "closeChannel";
}

enum MessageType {
  ECDH,
  Regular
}

interface Command {
  action: string
}

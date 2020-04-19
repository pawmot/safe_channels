import {Component, OnInit} from '@angular/core';
import { environment } from '../environments/environment';
import {curve, ec as EC} from "elliptic"
import * as hash from "hash.js"
import {Counter, ModeOfOperation, utils} from "aes-js";
import hex = utils.hex;
import utf8 = utils.utf8;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  channelName: string;
  lines: Line[] = [];
  socket: WebSocket;
  state: ChannelState = ChannelState.ENTRY;
  error?: string;
  message: string = "";
  private key: EC.KeyPair;
  private ec: EC;
  private sharedKey: number[];

  ngOnInit(): void {
    this.ec = new EC("curve25519");
    this.key = this.ec.genKeyPair();
    this.socket = AppComponent.getSocket();
    this.socket.onmessage = this.handle.bind(this);
  }

  connect() {
    this.socket.send(JSON.stringify(new ConnectToChannelCommand(this.channelName)))
    this.error = null;
  }

  create() {
    this.socket.send(JSON.stringify(new CreateChannelCommand(this.channelName)))
    this.error = null;
  }

  private handle(ev: MessageEvent) {
    switch (this.state) {
      case ChannelState.ENTRY:
        this.handleMessageInEntryState(ev);
        break;

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

  handleMessageInEntryState(ev: MessageEvent) {
    const result = <Result>JSON.parse(ev.data);
    if (result.code === ResultCodes.CHANNEL_CREATED) {
      this.state = ChannelState.OPEN;
      this.error = null;
      this.lines.push(new Line("Waiting for someone to join..."))
    } else if (result.code === ResultCodes.CONNECTED) {
      this.lines.push(new Line("Connected..."))
      this.initiateEcdh();
      this.state = ChannelState.ECDH;
      this.error = null;
    } else if (result.code === ResultCodes.CHANNEL_NAME_ALREADY_TAKEN) {
      this.error = "Channel name taken";
    } else if (result.code === ResultCodes.WRONG_CHANNEL) {
      this.error = "Wrong channel";
    } else if (result.code === ResultCodes.SOMETHING_WENT_WRONG) {
      this.error = "Something went wrong";
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
    this.socket.send(JSON.stringify(new MessageCommand(this.channelName, MessageType.Regular, cipherText)));
  }

  private static getSocket() : WebSocket {
    return new WebSocket(environment.wssAddress);
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
    this.socket.send(JSON.stringify(new MessageCommand(this.channelName, MessageType.ECDH, pubkey)));
    this.lines.push(new Line("Initiated ECDH, waiting for public key from second party..."));
  }
}

class Line {
  constructor(public text: string) {
  }
}

class CreateChannelCommand implements Command {
  constructor(public channelName: string) {
  }

  action: "createChannel" = "createChannel";
}

class ConnectToChannelCommand implements Command {
  constructor(public channelName: string) {
  }

  action: "connectToChannel" = "connectToChannel";
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

interface Result {
  code: ResultCodes;
}

enum ResultCodes {
  CHANNEL_CREATED,
  CONNECTED,
  CHANNEL_NAME_ALREADY_TAKEN,
  WRONG_CHANNEL,
  SOMETHING_WENT_WRONG
}

enum ChannelState {
  ENTRY,
  OPEN,
  ECDH,
  CONNECTED
}

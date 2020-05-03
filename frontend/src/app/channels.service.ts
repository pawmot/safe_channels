import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";
import {AppState} from "./reducers";
import {Store} from "@ngrx/store";
import {
  addIncomingMessage,
  addSystemMessage,
  channelCreated,
  channelCreationFailure, closeChannel,
  connected,
  connectionFailure, ecdhKeyArrived, otherConnected
} from "./reducers/actions";

@Injectable({
  providedIn: 'root'
})
export class ChannelsService {

  socket: WebSocket;
  private pingTimeoutId?: number = null;
  private connected = false;

  constructor(private store: Store<AppState>) {
  }

  connect(handler: Handler) {
    this.createSocket(handler);
  }

  private createSocket(handler: Handler) {
    this.socket = new WebSocket(environment.wssAddress);
    this.connected = true;
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onclose = (ev) => {
      this.connected = false;
      handler.handleClosing(ev);
    }
    this.pingTimeoutId = <number><unknown>setTimeout(() => {
      this.pingTimeoutId = null;
      this.sendToServer(new PingCommand())
    }, 5000);
  }

  private sendToServer(message: any) {
    if (!this.connected) return;
    this.socket.send(JSON.stringify(message));
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId);
    }
    this.pingTimeoutId = <number><unknown>setTimeout(() => {
      this.pingTimeoutId = null;
      this.sendToServer(new PingCommand())
    }, 5*60*1000);
  }

  private handleMessage(ev: MessageEvent) {
    let result = <Result>JSON.parse(ev.data);
    if (result.code !== undefined && result.code !== null) {
      switch (result.code) {
        case ResultCodes.CHANNEL_CREATED:
          this.store.dispatch(channelCreated({channelName: "TODO"}));
          break;

        case ResultCodes.CHANNEL_NAME_ALREADY_TAKEN:
          this.store.dispatch(channelCreationFailure({channelName: "TODO", errorCode: "channels.err.nameTaken"}));
          break;

        case ResultCodes.SOMETHING_WENT_WRONG:
          this.store.dispatch(channelCreationFailure({
            channelName: "TODO",
            errorCode: "channels.err.somethingWentWrong"
          }));
          break;

        case ResultCodes.CONNECTED:
          this.store.dispatch(connected({channelName: "TODO"}));
          break;

        case ResultCodes.WRONG_CHANNEL:
          this.store.dispatch(connectionFailure({channelName: "TODO", errorCode: "channels.err.wrongChannel"}));
          break;

        case ResultCodes.PONG:
          return;
      }
      return;
    }

    let cmd = <Command>JSON.parse(ev.data);
    switch (cmd.action) {
      case "connectToChannel":
        this.store.dispatch(otherConnected({channelName: (<ConnectToChannelCommand>cmd).channelName }));
        break;

      case "message":
        let msg = <MessageCommand>cmd;
        switch (msg.type) {
          case MessageType.ECDH:
            this.store.dispatch(ecdhKeyArrived({pubkey: msg.encodedMsg}));
            break;

          case MessageType.Regular:
            this.store.dispatch(addIncomingMessage({cyphertext: msg.encodedMsg}));
        }
        break;

      case "closeChannel":
        this.store.dispatch(closeChannel({channelName: "TODO"}));
        break;
    }
  }

  public createChannel(channelName: string) {
    this.sendToServer(new CreateChannelCommand(channelName));
  }

  public connectToChannel(channelName: string) {
    this.sendToServer(new ConnectToChannelCommand(channelName));
  }

  public sendEcdhMessage(channelName: string, pubkey: string) {
    this.sendToServer(new MessageCommand(channelName, MessageType.ECDH, pubkey));
    this.store.dispatch(addSystemMessage({content:"Initiated ECDH, waiting for public key from second party..."}));
  }

  public sendMessage(channelName: string, encryptedMsg: string) {
    this.sendToServer(new MessageCommand(channelName, MessageType.Regular, encryptedMsg));
  }
}

export interface Handler {
  handleClosing: (ev: CloseEvent) => void;
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

class PingCommand implements Command {
  action = "ping"
}

interface Command {
  action: string
}

enum MessageType {
  ECDH,
  Regular
}

interface Result {
  code: ResultCodes;
}

enum ResultCodes {
  CHANNEL_CREATED,
  CONNECTED,
  CHANNEL_NAME_ALREADY_TAKEN,
  WRONG_CHANNEL,
  PONG,
  SOMETHING_WENT_WRONG
}

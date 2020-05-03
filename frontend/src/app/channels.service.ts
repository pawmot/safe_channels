import {Injectable} from '@angular/core';
import {environment} from "../environments/environment";
import {AppState} from "./reducers";
import {Store} from "@ngrx/store";
import {channelCreated, channelCreationFailure, connected, connectionFailure} from "./reducers/actions";

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
    this.socket.onmessage = (ev) => this.handleMessage(ev, handler.handleMessage);
    this.socket.onclose = (ev) => {
      this.connected = false;
      handler.handleClosing(ev);
    }
    this.pingTimeoutId = <number><unknown>setTimeout(() => {
      this.pingTimeoutId = null;
      this.sendToServer(new PingCommand())
    }, 5000);
  }

  public sendToServer(message: any) {
    if (!this.connected) return;
    this.socket.send(JSON.stringify(message));
    if (this.pingTimeoutId) {
      clearTimeout(this.pingTimeoutId);
    }
    this.pingTimeoutId = <number><unknown>setTimeout(() => {
      this.pingTimeoutId = null;
      this.sendToServer(new PingCommand())
    }, 5000);
  }

  private handleMessage(ev: MessageEvent, unhandledMsgHandler: (ev: MessageEvent) => void) {
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
        default:
          unhandledMsgHandler(ev);
      }
    } else {
      unhandledMsgHandler(ev);
    }
  }

  public createChannel(channelName: string) {
    this.sendToServer(new CreateChannelCommand(channelName));
  }

  public connectToChannel(channelName: string) {
    this.sendToServer(new ConnectToChannelCommand(channelName));
  }
}

export interface Handler {
  handleMessage: (ev: MessageEvent) => void;
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

class PingCommand implements Command {
  action = "ping"
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
  PONG,
  SOMETHING_WENT_WRONG
}

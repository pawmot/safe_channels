import {Component, OnInit} from '@angular/core';
import { environment } from '../environments/environment';

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

  ngOnInit(): void {
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
    } else if (result.code === ResultCodes.CHANNEL_NAME_ALREADY_TAKEN) {
      this.error = "Channel name taken";
    } else if (result.code === ResultCodes.SOMETHING_WENT_WRONG) {
      this.error = "Something went wrong";
    }
  }

  handleMessageInOpenState(ev: MessageEvent) {

  }

  handleMessageInConnectedState(ev: MessageEvent) {

  }

  private static getSocket() : WebSocket {
    return new WebSocket(environment.wssAddress);
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

interface Command {
  action: string
}

interface Result {
  code: ResultCodes;
}

enum ResultCodes {
  CHANNEL_CREATED,
  CHANNEL_NAME_ALREADY_TAKEN,
  SOMETHING_WENT_WRONG
}

enum ChannelState {
  ENTRY,
  OPEN,
  CONNECTED
}

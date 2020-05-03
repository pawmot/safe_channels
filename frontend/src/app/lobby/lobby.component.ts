import {Component, OnInit} from '@angular/core';
import {Store} from "@ngrx/store";
import {selectAppState, State} from "../reducers";
import {addOutgoingMessage, connectToChannel, createChannel} from "../reducers/actions";
import {ChannelsService} from "../channels.service";
import {ChannelState} from "../reducers/model/Channel";
import {IncomingMessage, OutgoingMessage, SystemMessage} from "../reducers/model/Message";

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit {
  channelName: string;
  lines: Line[] = [];
  inChannel: boolean;
  connected: boolean;
  error?: string;
  message: string = "";

  constructor(private store: Store<State>, private channelsService: ChannelsService) {
    store.select(selectAppState).subscribe(state => {
      this.error = state.errorCode;
      if (state.channel) {
        this.inChannel = true;
        this.connected = state.channel.state === ChannelState.CONNECTED;
      } else {
        this.inChannel = false;
      }
      this.lines = state.messages.map(m => {
        switch (true) {
          case m instanceof SystemMessage:
            return new Line(m.content);

          case m instanceof IncomingMessage:
            return new Line(`<<< ${m.content}`);

          case m instanceof OutgoingMessage:
            return new Line(`>>> ${m.content}`);
        }
      })
    })
  }

  ngOnInit(): void {
    this.channelsService.connect({
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
    this.inChannel = false;
    this.channelName = "";
    this.message = "";
  }

  sendMessage() {
    this.store.dispatch(addOutgoingMessage({content: this.message}));
    this.message = "";
  }

}

class Line {
  constructor(public text: string) {
  }
}

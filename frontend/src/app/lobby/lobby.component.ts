import {Component, OnInit} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {ChannelDialogComponent, Mode} from "../channel-dialog/channel-dialog.component";
import {State} from "../store";
import {Store} from "@ngrx/store";
import {Observable} from "rxjs";
import {Channel, ChannelState} from "../store/channels/channels.model";
import {selectAllChannels, selectChannelByName} from "../store/channels/channels.selectors";
import {map, tap} from "rxjs/operators";
import {Message} from "../store/messages/messages.model";
import {selectMessagesByChannel} from "../store/messages/messages.selectors";
import {addOutgoingMessage} from "../store/messages/messages.actions";
import {markMessagesAsRead} from "../store/channels/channels.actions";

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit {
  selectedChannel: string = null;
  channelsToDisplay$: Observable<Channel[]>;
  messagesToDisplay$: Observable<Message[]>;
  connected$: Observable<boolean>;

  constructor(private dialog: MatDialog, private store: Store<State>) {
    this.channelsToDisplay$ = this.store.select(selectAllChannels).pipe(
      tap(cs =>
        cs.filter(c => c.name === this.selectedChannel && c.unreadCount > 0)
          .forEach(c => this.store.dispatch(markMessagesAsRead({channelName: c.name})))),
      map(cs => cs.filter(c => c.state > ChannelState.Error))
    );
  }

  ngOnInit() {

  }

  connectToChannel() {
    this.dialog.open(ChannelDialogComponent, {
      minWidth: 350,
      disableClose: true,
      data: {
        mode: Mode.CONNECT
      }
    });
  }

  createChannel() {
    this.dialog.open(ChannelDialogComponent, {
      minWidth: 350,
      disableClose: true,
      data: {
        mode: Mode.CREATE
      }
    });
  }

  handleChannelSelected(channelName: string) {
    this.selectedChannel = channelName;
    if (channelName) {
      this.messagesToDisplay$ = this.store.select(selectMessagesByChannel(channelName));
      this.connected$ = this.store.select(selectChannelByName(channelName)).pipe(map(c => c.state === ChannelState.Connected));
    }
  }

  handleMessageSent(message: string) {
    this.store.dispatch(addOutgoingMessage({channelName: this.selectedChannel, content: message}));
  }
}

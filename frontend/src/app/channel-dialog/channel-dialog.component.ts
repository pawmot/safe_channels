import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {State} from "../store";
import {Store} from "@ngrx/store";
import {connectToChannel, createChannel, closeChannel} from "../store/channels/channels.actions";
import {selectChannelByName} from "../store/channels/channels.selectors";
import {filter, take, takeUntil, takeWhile} from "rxjs/operators";
import {ChannelState} from "../store/channels/channels.model";
import {FormControl} from "@angular/forms";

@Component({
  selector: 'app-channel-dialog',
  templateUrl: './channel-dialog.component.html',
  styleUrls: ['./channel-dialog.component.scss']
})
export class ChannelDialogComponent implements OnInit {
  public Mode = Mode;
  channelName = new FormControl('');
  error: string;

  constructor(
    public dialogRef: MatDialogRef<ChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ChannelDialogData,
    private store: Store<State>) {
  }

  ngOnInit(): void {
  }

  async performAction() {
    this.channelName.setErrors(null);
    this.error = null;
    const channel = await this.store.select(selectChannelByName(this.channelName.value)).pipe(
      take(1)
    ).toPromise();

    if (channel) {
      this.channelName.setErrors({'incorrect': true});
      this.error = this.data.mode === Mode.CREATE ?
        "Channel already exists" :
        "Channel is not available for connection";
      return;
    }

    this.store.select(selectChannelByName(this.channelName.value)).pipe(
      filter(chan => !!chan),
      filter(chan => chan.state === ChannelState.Error ||
        chan.state === ChannelState.Created ||
        chan.state === ChannelState.Ecdh),
      take(1)
    ).subscribe(c => {
      if (c.state === ChannelState.Error) {
        this.store.dispatch(closeChannel({channelName: c.name}));
        this.channelName.setErrors({'incorrect': true});
        switch (c.error) {
          case "wrongChannel":
            this.error = "Channel is not available for connection";
            break;

          case "nameAlreadyTaken":
            this.error = "Channel already exists";
            break;

          case "somethingWentWrong":
            this.error = "Something went wrong";
            break;
        }
      } else {
        this.dialogRef.close();
      }
    });

    if (this.data.mode === Mode.CREATE) {
      this.store.dispatch(createChannel({channelName: this.channelName.value}));
    } else if (this.data.mode === Mode.CONNECT) {
      this.store.dispatch(connectToChannel({channelName: this.channelName.value}));
    }
  }

  close() {
    this.dialogRef.close();
  }
}

export interface ChannelDialogData {
  mode: Mode;
}

export enum Mode {
  CREATE,
  CONNECT
}

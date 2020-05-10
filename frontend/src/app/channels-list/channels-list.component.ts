import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {Channel} from "../store/channels/channels.model";
import {Observable} from "rxjs";
import {tap} from "rxjs/operators";

@Component({
  selector: 'app-channels-list',
  templateUrl: './channels-list.component.html',
  styleUrls: ['./channels-list.component.scss']
})
export class ChannelsListComponent implements OnInit {
  @Input() channels$: Observable<Channel[]>;
  @Output() createChannel = new EventEmitter<void>();
  @Output() connectToChannel = new EventEmitter<void>();
  @Output() channelSelected = new EventEmitter<string>();
  selectedChannel: string = null
  channels: Channel[]

  constructor() { }

  ngOnInit(): void {
    this.channels$.pipe(
      tap(cs => {
        if (!cs.find(c => c.name === this.selectedChannel)) {
          if (cs.length > 0) {
            this.selectChannel(cs[0].name);
          } else {
            this.selectChannel(null);
          }
        }
      }
    )).subscribe(cs => this.channels = cs);
  }

  selectChannel(channelName: string) {
    this.selectedChannel = channelName;
    this.channelSelected.emit(channelName);
  }
}

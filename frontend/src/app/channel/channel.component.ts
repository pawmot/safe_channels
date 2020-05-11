import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {IncomingMessage, Message, OutgoingMessage, SystemMessage} from "../store/messages/messages.model";

@Component({
  selector: 'app-channel',
  templateUrl: './channel.component.html',
  styleUrls: ['./channel.component.scss']
})
export class ChannelComponent implements OnInit {
  @Input() messages: Message[];
  @Input() connected: boolean;
  @Output() messageSent = new EventEmitter<string>();
  message: string = "";

  constructor() { }

  ngOnInit(): void {
  }

  sendMessage() {
    this.messageSent.emit(this.message);
    this.message = "";
  }

  getType(msg: Message): string {
    if (msg instanceof SystemMessage) {
      return "system";
    } else if (msg instanceof IncomingMessage) {
      return "incoming";
    } else if (msg instanceof OutgoingMessage) {
      return "outgoing";
    }
  }
}

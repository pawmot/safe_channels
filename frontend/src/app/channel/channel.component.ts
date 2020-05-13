import {AfterViewInit, Component, EventEmitter, Input, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {IncomingMessage, Message, OutgoingMessage, SystemMessage} from "../store/messages/messages.model";

@Component({
  selector: 'app-channel',
  templateUrl: './channel.component.html',
  styleUrls: ['./channel.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ChannelComponent implements AfterViewInit {
  @Input() messages: Message[];
  @Input() connected: boolean;
  @Input() selectedChannel: string;
  @Output() messageSent = new EventEmitter<string>();
  @ViewChild("messageInput") messageInput;
  drafts = new Map<string, string>();

  constructor() { }

  ngAfterViewInit(): void {
    this.messageInput.nativeElement.focus();
  }

  sendMessage() {
    this.messageSent.emit(this.drafts.get(this.selectedChannel));
    this.drafts.set(this.selectedChannel, "");
    this.messageInput.nativeElement.focus();
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

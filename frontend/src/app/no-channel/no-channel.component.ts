import {Component, EventEmitter, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-no-channel',
  templateUrl: './no-channel.component.html',
  styleUrls: ['./no-channel.component.scss']
})
export class NoChannelComponent implements OnInit {
  @Output() createChannel = new EventEmitter<void>();
  @Output() connectToChannel = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

}

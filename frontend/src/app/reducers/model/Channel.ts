export class Channel {
  constructor(public name: string, public isChannelCreator: boolean, public state: ChannelState = ChannelState.OPEN) {
  }
}

export enum ChannelState {
  ENTRY,
  OPEN,
  ECDH,
  CONNECTED
}

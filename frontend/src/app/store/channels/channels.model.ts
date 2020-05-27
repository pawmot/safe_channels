export interface Channel {
  id: string;
  name: string;
  state: ChannelState,
  error: "nameAlreadyTaken" | "wrongChannel" | "somethingWentWrong",
  fingerprint: string,
  localPubKey: string,
  remotePubKey: string,
  unreadCount: number
}

export enum ChannelState {
  CreationPending,
  Connecting,
  Error,
  Created,
  Ecdh,
  Connected,
  Closed
}

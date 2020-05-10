export interface Channel {
  id: string;
  name: string;
  state: ChannelState,
  error: "nameAlreadyTaken" | "wrongChannel" | "somethingWentWrong",
  sharedKey: number[],
  fingerprint: string,
  localPubKey: string,
  remotePubKey: string
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

import {createAction, props} from "@ngrx/store";

export const createChannel = createAction(
  "[Channel] Create",
  props<{ channelName: string }>()
);

export const channelCreated = createAction(
  "[Channel] Created",
  props<{ channelName: string }>()
);

export const channelCreationFailed = createAction(
  "[Channel] Creation Failed",
  props<{ channelName: string, reason: "nameAlreadyTaken" | "somethingWentWrong" }>()
);

export const connectToChannel = createAction(
  "[Channel] Connect",
  props<{ channelName: string }>()
);

export const connected = createAction(
  "[Channel] Connected",
  props<{ channelName: string }>()
);

export const connectionFailed = createAction(
  "[Channel] Connecton Failed",
  props<{ channelName: string, reason: "wrongChannel" | "somethingWentWrong" }>()
);

export const closeChannel = createAction(
  "[Channel] Close",
  props<{ channelName: string }>()
);

export const channelClosed = createAction(
  "[Channel] Closed",
  props<{ channelName: string }>()
);

export const cryptoData = createAction(
  "[Channel] Crypto Data",
  props<{ channelName: string, sharedKey: number[], fingerprint: string, localPubKey: string, remotePubKey: string }>()
);

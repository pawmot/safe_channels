import { createAction, props } from '@ngrx/store';

export const createChannel = createAction(
  '[Channel] Create',
  props<{ channelName: string }>()
);

export const channelCreated = createAction(
  '[Channel] Created',
  props<{ channelName: string }>()
);

export const channelCreationFailure = createAction(
  '[Channel] CreationFailure',
  props<{ channelName: string, errorCode: string }>()
);

export const connectToChannel = createAction(
  '[Channel] Connect',
  props<{ channelName: string }>()
);

export const connected = createAction(
  '[Channel] Connected',
  props<{ channelName: string }>()
);

export const otherConnected = createAction(
  '[Channel] Other connected',
  props<{ channelName: string }>()
);

export const connectionFailure = createAction(
  '[Channel] Connection failure',
  props<{ channelName: string, errorCode: string }>()
);

export const ecdhKeyArrived = createAction(
  '[Channel] ECDH key arrived',
  props<{ pubkey: string }>()
);

export const addSystemMessage = createAction(
  '[Channel] Add system message',
  props<{ content: string }>()
);

export const addOutgoingMessage = createAction(
  '[Channel] Add outgoing message',
  props<{ content: string }>()
);

export const addIncomingMessage = createAction(
  '[Channel] Incoming message arrival',
  props<{ cyphertext: string }>()
);

export const closeChannel = createAction(
  '[Channel] Close',
  props<{ channelName: string }>()
)

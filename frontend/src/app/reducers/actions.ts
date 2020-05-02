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

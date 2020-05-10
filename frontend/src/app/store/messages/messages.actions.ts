import {createAction, props} from "@ngrx/store";

export const addSystemMessage = createAction(
  "[Messages] System",
  props<{channelName: string, content: string}>()
)

export const addOutgoingMessage = createAction(
  "[Messages] Outgoing",
  props<{channelName: string, content: string}>()
)

export const addIncomingMessage = createAction(
  "[Messages] Incoming",
  props<{channelName: string, content: string}>()
)

import {IncomingMessage, Message, OutgoingMessage, SystemMessage} from "./messages.model";
import {Action, createReducer, on} from "@ngrx/store";
import {addIncomingMessage, addOutgoingMessage, addSystemMessage} from "./messages.actions";

export interface MessagesState {
  messagesByChannel: Map<string, Message[]>
}

const initialState = {
  messagesByChannel: new Map<string, Message[]>()
}
const reducer = createReducer<MessagesState>(
  initialState,
  on(addSystemMessage, (state, {channelName, content}) => {
    return addMessage(channelName, new SystemMessage(content), state);
  }),
  on(addOutgoingMessage, (state, {channelName, content}) => {
    return addMessage(channelName, new OutgoingMessage(content), state);
  }),
  on(addIncomingMessage, (state, {channelName, content}) => {
    return addMessage(channelName, new IncomingMessage(content), state);
  })
)

function addMessage(channelName: string, message: Message, state: MessagesState): MessagesState {
  let newState = {messagesByChannel: new Map(state.messagesByChannel)};
  if (state.messagesByChannel.has(channelName)) {
    newState.messagesByChannel.set(channelName, [...state.messagesByChannel.get(channelName), message]);
  } else {
    newState.messagesByChannel.set(channelName, [message]);
  }
  return newState;
}

export function messagesReducer(state: MessagesState | undefined, action: Action) {
  return reducer(state, action);
}

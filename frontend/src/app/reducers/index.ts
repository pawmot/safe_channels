import {ActionReducer, ActionReducerMap, createReducer, createSelector, MetaReducer, on} from '@ngrx/store';
import {environment} from '../../environments/environment';
import {Channel} from "./model/Channel";
import {
  addIncomingMessage, addOutgoingMessage, addSystemMessage,
  channelCreated,
  channelCreationFailure, closeChannel,
  connected,
  connectionFailure, connectToChannel,
  createChannel,
  ecdhKeyArrived
} from "./actions";
import {IncomingMessage, Message, OutgoingMessage, SystemMessage} from "./model/Message";

export interface State {
  appState: AppState;
}

export interface AppState {
  channelName: string,
  channel: Channel,
  messages: Message[],
  errorCode: string
}

const initialState: AppState = {
  channelName: null,
  channel: null,
  messages: [],
  errorCode: null
}

export const appStateReducers = createReducer<AppState>(
  initialState,
  on(createChannel, (state, {channelName}) => ({...state, channelName: channelName})),
  on(channelCreated, (state, {channelName}) => ({
    ...state,
    channel: new Channel(state.channelName, true),
    messages: [new SystemMessage("Waiting for someone to join...")],
    errorCode: null
  })),
  on(channelCreationFailure, (state, {errorCode}) => ({...state, errorCode: errorCode})),
  on(connectToChannel, (state, {channelName}) => ({...state, channelName: channelName})),
  on(connected, (state, {channelName}) =>({
    ...state,
    channel: new Channel(state.channelName, false),
    messages: [new SystemMessage("Connected...")],
    errorCode: null
  })),
  on(connectionFailure, (state, {errorCode}) => ({...state, errorCode: errorCode})),
  on(ecdhKeyArrived, (state, {pubkey}) => {
    let channel = Channel.withOtherPubKey(state.channel, pubkey);
    return {
      ...state,
      channel: channel,
      messages: [
        ...state.messages,
        new SystemMessage("ECDH complete, channel is now secure!"),
        new SystemMessage(`Channel fingerprint: ${channel.getFingerprint()}`)
      ]};
  }),
  on(addSystemMessage, (state, {content}) => ({
    ...state,
    messages: [...state.messages, new SystemMessage(content)]
  })),
  on(addIncomingMessage, (state, {cyphertext}) => ({
    ...state,
    messages: [...state.messages, new IncomingMessage(state.channel.decrypt(cyphertext))]
  })),
  on(addOutgoingMessage, (state, {content}) => ({
    ...state,
    messages: [...state.messages, new OutgoingMessage(content)]
  })),
  on(closeChannel, _ => initialState)
)

// const channelsReducer = createReducer(
//   initialChannel,
//   on(channelCreated, (appState, { channelName }) => new Channel(channelName)),
//   on(channelCreationFailure, (appState, { channelName, errorCode}) => )
// )

export const reducers: ActionReducerMap<State> = {
  appState: appStateReducers
};

export const selectAppState = (state: State) => state.appState
export const selectChannel = createSelector(
  selectAppState,
  s => s.channel
)

export const metaReducers: MetaReducer<State>[] = !environment.production ? [logger] : [];

function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    console.log(action);
    return reducer(state, action);
  }
}

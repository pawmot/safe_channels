import {createEntityAdapter, EntityAdapter, EntityState} from '@ngrx/entity';
import {Channel, ChannelState} from "./channels.model";
import {Action, createReducer, on} from "@ngrx/store";
import {
  channelClosed,
  channelCreated,
  channelCreationFailed,
  closeChannel,
  connected,
  connectionFailed,
  connectToChannel,
  createChannel,
  cryptoData
} from "./channels.actions";

export interface ChannelsState extends EntityState<Channel> {
}

export const adapter: EntityAdapter<Channel> = createEntityAdapter<Channel>();

const initialState: ChannelsState = adapter.getInitialState();
const reducer = createReducer<ChannelsState>(
  initialState,
  on(closeChannel, (state, {channelName}) =>
    adapter.removeOne(channelName, state)),
  on(createChannel, (state, {channelName}) =>
    adapter.addOne({
      id: channelName,
      name: channelName,
      state: ChannelState.CreationPending,
      error: null,
      sharedKey: null,
      fingerprint: null,
      localPubKey: null,
      remotePubKey: null
    }, state)),
  on(channelCreationFailed, (state, {channelName, reason}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Error, error: reason}}, state)),
  on(channelCreated, (state, {channelName}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Created}}, state)),
  on(connectToChannel, (state, {channelName}) =>
    adapter.addOne({
      id: channelName,
      name: channelName,
      state: ChannelState.Connecting,
      error: null,
      sharedKey: null,
      fingerprint: null,
      localPubKey: null,
      remotePubKey: null
    }, state)),
  on(connectionFailed, (state, {channelName, reason}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Error, error: reason}}, state)),
  on(connected, (state, {channelName}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Ecdh}}, state)),
  on(cryptoData, (state, {channelName, sharedKey, fingerprint, localPubKey, remotePubKey}) => {
    return adapter.updateOne({
      id: channelName,
      changes: {
        sharedKey: sharedKey,
        fingerprint: fingerprint,
        localPubKey: localPubKey,
        remotePubKey: remotePubKey,
        state: ChannelState.Connected
      }
    }, state);
  }),
  on(channelClosed, (state, {channelName}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Closed}}, state))
)

export function channelsReducer(state: ChannelsState | undefined, action: Action) {
  return reducer(state, action);
}

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
  cryptoData, markMessagesAsRead, newUnreadMessage
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
      fingerprint: null,
      localPubKey: null,
      remotePubKey: null,
      unreadCount: 0
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
      fingerprint: null,
      localPubKey: null,
      remotePubKey: null,
      unreadCount: 0
    }, state)),
  on(connectionFailed, (state, {channelName, reason}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Error, error: reason}}, state)),
  on(connected, (state, {channelName}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Ecdh}}, state)),
  on(cryptoData, (state, {channelName, fingerprint, localPubKey, remotePubKey}) => {
    return adapter.updateOne({
      id: channelName,
      changes: {
        fingerprint: fingerprint,
        localPubKey: localPubKey,
        remotePubKey: remotePubKey,
        state: ChannelState.Connected
      }
    }, state);
  }),
  on(channelClosed, (state, {channelName}) =>
    adapter.updateOne({id: channelName, changes: {state: ChannelState.Closed}}, state)),
  on(newUnreadMessage, (state, {channelName}) => {
    const channel = state.entities[channelName];
    return adapter.updateOne({id: channelName, changes: {unreadCount: channel.unreadCount + 1}}, state);
  }),
  on(markMessagesAsRead, (state, {channelName}) =>
    adapter.updateOne({id: channelName, changes: {unreadCount: 0}}, state))
)

export function channelsReducer(state: ChannelsState | undefined, action: Action) {
  return reducer(state, action);
}

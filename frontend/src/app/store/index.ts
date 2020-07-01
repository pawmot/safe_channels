import {ActionReducer, ActionReducerMap, createReducer, createSelector, MetaReducer, on} from '@ngrx/store';
import {environment} from '../../environments/environment';
import {channelsReducer, ChannelsState} from "./channels/channels.reducer";
import {messagesReducer, MessagesState} from "./messages/messages.reducer";

export interface State {
  channels: ChannelsState,
  messages: MessagesState
}

export const reducers: ActionReducerMap<State> = {
  channels: channelsReducer,
  messages: messagesReducer
};

export const selectChannelsState = (state: State) => state.channels;
export const selectMessagesState = (state: State) => state.messages;

export const metaReducers: MetaReducer<State>[] = !environment.config.production ? [logger] : [];

function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    console.log(action);
    return reducer(state, action);
  }
}

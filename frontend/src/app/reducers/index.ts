import {
  ActionReducer,
  ActionReducerMap,
  createReducer, createSelector,
  MetaReducer, on
} from '@ngrx/store';
import { environment } from '../../environments/environment';
import {Channel} from "./model/Channel";
import {channelCreated, channelCreationFailure, createChannel} from "./actions";

export interface State {
  appState: AppState;
}

export interface AppState {
  channel: Channel,
  errorCode: string
}

const initialState: AppState = {
  channel: null,
  errorCode: null
}

export const appStateReducers = createReducer(
  initialState,
  on(channelCreated, (_, { channelName }) => ({ channel: new Channel(channelName, true), errorCode: null})),
  on(channelCreationFailure, (state, { errorCode}) => ({...state, errorCode: errorCode}))
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

export const metaReducers: MetaReducer<State>[] = !environment.production ? [logger] : [];

function logger(reducer: ActionReducer<State>): ActionReducer<State> {
  return (state, action) => {
    console.log(action);
    return reducer(state, action);
  }
}

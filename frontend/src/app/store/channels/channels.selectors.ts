import {createSelector} from "@ngrx/store";
import {selectChannelsState} from "../index";
import {adapter} from "./channels.reducer";

export const selectChannelByName = (channelName: string) =>
  createSelector(selectChannelsState,
    (channels) => channels.entities[channelName]);

const {
  selectIds,
  selectEntities,
  selectAll,
  selectTotal,
} = adapter.getSelectors();

export const selectChannelIds = createSelector(selectChannelsState, selectIds);
export const selectChannelEntities = createSelector(selectChannelsState, selectEntities);
export const selectAllChannels = createSelector(selectChannelsState, selectAll);
export const selectChannelsTotal = createSelector(selectChannelsState, selectTotal);

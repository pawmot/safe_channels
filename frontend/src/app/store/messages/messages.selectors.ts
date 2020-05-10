import {createSelector} from "@ngrx/store";
import {selectMessagesState} from "../index";

export const selectMessagesByChannel = (channelName: string) =>
  createSelector(
    selectMessagesState,
    (messages) => messages.messagesByChannel.get(channelName)
  );

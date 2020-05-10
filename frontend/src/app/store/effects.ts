import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType, ROOT_EFFECTS_INIT} from '@ngrx/effects';
import {ChannelsService} from "../channels.service";
import {State} from "./index";
import {Store} from "@ngrx/store";
import {of} from "rxjs";
import {map, tap} from "rxjs/operators";
import {connectToChannel, createChannel} from "./channels/channels.actions";
import {addOutgoingMessage} from "./messages/messages.actions";

@Injectable()
export class ChannelEffects {

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private channelsService: ChannelsService) {
  }

  init$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      tap(_ => this.channelsService.connect())
    )
  }, {dispatch: false});

  createChannel$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(createChannel),
      map(a => a.channelName),
      tap(name => this.channelsService.createChannel(name))
    )
  }, {dispatch: false});

  connectToChannel$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(connectToChannel),
      map(a => a.channelName),
      tap(name => this.channelsService.connectToChannel(name))
    )
  }, {dispatch: false});

  sendMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(addOutgoingMessage),
      tap(a => this.channelsService.sendMessage(a.channelName, a.content))
    )
  }, {dispatch: false})
}

import {Injectable} from '@angular/core';
import {act, Actions, createEffect, ofType} from '@ngrx/effects';
import {ChannelsService} from "../channels.service";
import {addOutgoingMessage, connected, connectToChannel, createChannel, otherConnected} from "./actions";
import {concatMap, map, tap, withLatestFrom} from "rxjs/operators";
import {selectChannel, State} from "./index";
import {Store} from "@ngrx/store";
import {of} from "rxjs";

@Injectable()
export class ChannelEffects {

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private channelsService: ChannelsService) {
  }

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

  ecdhMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(connected, otherConnected),
      concatMap(action => of(action).pipe(
        withLatestFrom(this.store.select(selectChannel))
      )),
      tap(([action, channel]) => {
        this.channelsService.sendEcdhMessage(channel.name, channel.getEncodedPublicKey())
      })
    )
  }, {dispatch: false});

  sendMessage$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(addOutgoingMessage),
      concatMap(action => of(action).pipe(
        withLatestFrom(this.store.select(selectChannel))
      )),
      tap(([action, channel]) => {
        this.channelsService.sendMessage(channel.name, channel.encrypt(action.content))
      })
    )
  }, {dispatch: false})
}

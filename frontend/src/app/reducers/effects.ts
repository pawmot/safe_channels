import { Injectable } from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {ChannelsService} from "../channels.service";
import {createChannel} from "./actions";
import {map, switchMap, tap, withLatestFrom} from "rxjs/operators";
import {EMPTY} from "rxjs";

@Injectable()
export class ChannelEffects {

  constructor(private actions$: Actions, private channelsService: ChannelsService) {}

  createChannel$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(createChannel),
      map(a => a.channelName),
      tap(name => this.channelsService.createChannel(name)),
      switchMap(_ => EMPTY)
    )
  })
}

import {BrowserModule} from '@angular/platform-browser';
import {enableProdMode, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {environment} from '../environments/environment';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {NgxLinkifyjsModule} from "ngx-linkifyjs";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { ChannelComponent } from './channel/channel.component';
import { LobbyComponent } from './lobby/lobby.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import {metaReducers, reducers} from "./reducers";
import {ChannelEffects} from "./reducers/effects";

@NgModule({
  declarations: [
    AppComponent,
    ChannelComponent,
    LobbyComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CommonModule,
    NgxLinkifyjsModule.forRoot(),
    BrowserAnimationsModule,
    StoreModule.forRoot(reducers, {metaReducers: metaReducers}),
    EffectsModule.forRoot([ChannelEffects])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}

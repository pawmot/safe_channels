import {BrowserModule} from '@angular/platform-browser';
import {enableProdMode, NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {environment} from '../environments/environment';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {NgxLinkifyjsModule} from "ngx-linkifyjs";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { ChannelComponent } from './channel/channel.component';
import { LobbyComponent } from './lobby/lobby.component';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import {metaReducers, reducers} from "./store";
import {ChannelEffects} from "./store/effects";
import { ChannelsListComponent } from './channels-list/channels-list.component';
import {MatModule} from "./mat/mat.module";
import { NoChannelComponent } from './no-channel/no-channel.component';
import { ChannelDialogComponent } from './channel-dialog/channel-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    ChannelComponent,
    LobbyComponent,
    ChannelsListComponent,
    NoChannelComponent,
    ChannelDialogComponent,
  ],
  imports: [
    MatModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NgxLinkifyjsModule.forRoot(),
    BrowserAnimationsModule,
    StoreModule.forRoot(reducers, {metaReducers: metaReducers, runtimeChecks: {strictStateImmutability: true}}), // TODO: enable strict state immutability
    EffectsModule.forRoot([ChannelEffects])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}

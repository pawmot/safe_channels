import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { environmentManager as loadEnvironment } from "./environments/manager";

loadEnvironment.then(() => {
  if (environment.config.production) {
    enableProdMode();
  }

  return platformBrowserDynamic().bootstrapModule(AppModule)
}).catch(err => console.error(err));


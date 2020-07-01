import { environment } from "./environment";
import { settingsLoader } from "./loader";

export const environmentManager: Promise<void> =
  (environment.remoteConfig ? settingsLoader() : Promise.resolve()).then(validateSettings);

function validateSettings(): void {
  if (environment.config.production == null ||
    environment.config.wssAddress == null) {
    throw new Error(`Settings are invalid, cannot start the application!`);
  }
}

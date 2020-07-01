import { environment } from "./environment";

export function settingsLoader(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xmlhttp = new XMLHttpRequest(),
      method = "GET",
      url = "./appConfig";
    xmlhttp.open(method, url, true);
    xmlhttp.onload = function (): void {
      if (xmlhttp.status === 200) {
        environment.config = JSON.parse(xmlhttp.responseText);
        resolve();
      } else {
        reject(`Could not get settings from server. Status code: ${xmlhttp.status}.`);
      }
    };
    xmlhttp.send();
  });
}

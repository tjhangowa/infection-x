import { Application } from "pixi.js";

export class App {
  static pixi: Application;

  static async init() {
    App.pixi = new Application();

    await App.pixi.init({
      resizeTo: window,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      antialias: true,
      backgroundAlpha: 1,
    });

    const container = document.getElementById("pixi-container");
    (container ?? document.body).appendChild(App.pixi.canvas);

    App.pixi.stage.sortableChildren = true;
  }
}

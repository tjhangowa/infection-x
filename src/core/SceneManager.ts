import { Container } from "pixi.js";
import { App } from "./app";

export class SceneManager {
  private static currentScene: Container | null = null;

  static async changeScene(
    newScene: Container & { load?: () => Promise<void> },
  ) {
    const app = App.pixi;

    if (SceneManager.currentScene) {
      app.stage.removeChild(SceneManager.currentScene);
      SceneManager.currentScene.destroy({ children: true });
    }

    if (newScene.load) {
      await newScene.load();
    }

    app.stage.addChild(newScene);
    SceneManager.currentScene = newScene;
  }

  static getScene() {
    return SceneManager.currentScene;
  }
}

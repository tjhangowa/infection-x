import "./network/socket";
import { App } from "./core/app";
import { SceneManager } from "./core/SceneManager";
import { MainMenuScene } from "./scenes/MainMenuScene"; // ✅ Import MainMenu
import "./style.css";

async function main() {
  await App.init();
  // ✅ Start at Main Menu
  await SceneManager.changeScene(new MainMenuScene());
}

main();

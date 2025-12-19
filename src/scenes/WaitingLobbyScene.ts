import { Text, Container } from "pixi.js";
import { BaseScene } from "./BaseScene";
import { App } from "../core/app";
import { createTextButton } from "../ui/TextButton";
import { SceneManager } from "../core/SceneManager";
import { MainMenuScene } from "./MainMenuScene";
import { GameMapScene } from "./GameMapScene"; // Import GameMap
import { socket } from "../network/socket"; // Import Socket

export class WaitingLobbyScene extends BaseScene {
  private labelText!: Text;
  private backButton!: Container;

  constructor() {
    super();
  }

  async load() {
    this.createLabel();
    this.createBackButton();
    this.layout();

    window.addEventListener("resize", () => this.layout());
    // ----------------------------------------
    // ✅ LOBBY LOGIC
    // ----------------------------------------

    // 1. Listen for player count updates (Visual feedback)
    socket.on("lobbyUpdate", (data: { count: number }) => {
      this.labelText.text = `Waiting for Players... (${data.count}/2)`;
      // Re-center text since width changed
      this.layout();
    });

    // 2. Listen for the start signal
    socket.on("startGame", () => {
      console.log("Server started the game! Switching scenes...");
      SceneManager.changeScene(new GameMapScene());
    });
    socket.emit("joinLobby");
  }

  private createLabel() {
    this.labelText = new Text("Waiting for Players...", {
      fontFamily: "GameFont",
      fontSize: 72,
      fill: "#FFD700",
      align: "center",
    });

    this.addChild(this.labelText);
  }

  private createBackButton() {
    this.backButton = createTextButton("BACK", () => {
      SceneManager.changeScene(new MainMenuScene());
    });

    this.addChild(this.backButton);
  }

  private layout() {
    const w = App.pixi.renderer.width;
    const h = App.pixi.renderer.height;

    this.labelText.x = (w - this.labelText.width) / 2;
    this.labelText.y = h * 0.3;

    this.backButton.x = w / 2;
    this.backButton.y = h * 0.75;
  }

  override destroyScene() {
    // ⚠️ IMPORTANT: Remove listeners when leaving the scene
    socket.off("lobbyUpdate");
    socket.off("startGame");

    // remove resize listener
    window.removeEventListener("resize", () => this.layout());
    super.destroyScene();
  }
}

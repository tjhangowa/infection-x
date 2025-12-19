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
  private resizeHandler = () => this.layout();

  constructor() {
    super();
  }

  async load() {
    this.createLabel();
    this.createBackButton();
    this.layout();

    window.addEventListener("resize", this.resizeHandler);
    // ----------------------------------------
    // ✅ LOBBY LOGIC
    // ----------------------------------------

    // 1. Listen for player count updates (Visual feedback)
    socket.on("lobbyUpdate", (data: { count: number; required?: number }) => {
      const max = data.required || 4; //default to 4 if server doesn't send it
      this.labelText.text = `Waiting for Players: ${data.count}/${max}`;
      // Re-center text since width changed
      this.layout();
    });

    // 2. Listen for the start signal
    socket.on("startGame", async () => {
      console.log("Server started the game! Switching scenes...");
      await SceneManager.changeScene(new GameMapScene());
    });
    
    // Only emit joinLobby if socket is connected
    if (socket.connected) {
      socket.emit("joinLobby");
    } else {
      // Wait for connection if not connected yet
      socket.once("connect", () => {
        socket.emit("joinLobby");
      });
    }
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
    this.backButton = createTextButton("BACK", async () => {
      await SceneManager.changeScene(new MainMenuScene());
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
    socket.off("connect"); // Remove any pending connect listener

    // remove resize listener using the stored reference
    window.removeEventListener("resize", this.resizeHandler);
    super.destroyScene();
  }
}

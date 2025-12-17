import { Container, Text, TextStyle } from "pixi.js";
import { App } from "../core/app";

export class GameHUD extends Container {
  private timeText: Text;
  private playerText: Text;
  private spectatingText: Text;
  private centerText: Text;
  private subCenterText: Text;
  private lobbyTimerText: Text;

  // ✅ FIX 1: Add missing property declarations
  private powerUpText: Text;
  private powerUpTimeRemaining: number = 0;

  constructor() {
    super();

    const baseStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: "bold",
      fill: "#FFFFFF",
      stroke: { color: "#000000", width: 4 },
      align: "center",
    });

    // 1. Time Display (Top Left)
    this.timeText = new Text({ text: "Time: 5:00", style: baseStyle });
    this.timeText.x = 20;
    this.timeText.y = 20;
    this.addChild(this.timeText);

    // 2. Player Count (Below Time)
    this.playerText = new Text({ text: "Alive: 0/0", style: baseStyle });
    this.playerText.x = 20;
    this.playerText.y = 55;
    this.addChild(this.playerText);

    // 3. Spectating Label (Top Center - Hidden by default)
    this.spectatingText = new Text({
      text: "SPECTATING MODE",
      style: { ...baseStyle, fill: "#FFFF00", fontSize: 30 },
    });
    this.spectatingText.anchor.set(0.5, 0);
    this.spectatingText.x = App.pixi.renderer.width / 2;
    this.spectatingText.y = 20;
    this.spectatingText.visible = false;
    this.addChild(this.spectatingText);

    // 4. Center Game Over Text (Hidden)
    this.centerText = new Text({
      text: "",
      style: { ...baseStyle, fontSize: 60, fill: "#FFFFFF" },
    });
    this.centerText.anchor.set(0.5);
    this.centerText.x = App.pixi.renderer.width / 2;
    this.centerText.y = App.pixi.renderer.height / 2 - 50;
    this.centerText.visible = false;
    this.addChild(this.centerText);

    // 5. Sub-text (Win Reason)
    this.subCenterText = new Text({
      text: "",
      style: { ...baseStyle, fontSize: 32, fill: "#CCCCCC" },
    });
    this.subCenterText.anchor.set(0.5);
    this.subCenterText.x = App.pixi.renderer.width / 2;
    this.subCenterText.y = App.pixi.renderer.height / 2 + 20;
    this.subCenterText.visible = false;
    this.addChild(this.subCenterText);

    // 6. Lobby Timer (Bottom Left)
    this.lobbyTimerText = new Text({
      text: "",
      style: { ...baseStyle, fill: "#FFAA00" },
    });
    this.lobbyTimerText.anchor.set(0, 1);
    this.lobbyTimerText.x = 20;
    this.lobbyTimerText.y = App.pixi.renderer.height - 20;
    this.lobbyTimerText.visible = false;
    this.addChild(this.lobbyTimerText);

    // ✅ FIX 2: This logic is now INSIDE the constructor
    this.powerUpText = new Text({
      text: "",
      style: {
        fontFamily: "Arial",
        fontSize: 24,
        fill: 0x00ffff, // Cyan color
        stroke: { color: "#000000", width: 4 },
        fontWeight: "bold",
      },
    });
    this.powerUpText.anchor.set(0.5, 0); // Top-Center
    this.powerUpText.visible = false;
    this.addChild(this.powerUpText);
  }

  updateStats(
    timeRemainingSec: number,
    currentAlive: number,
    totalStart: number,
  ) {
    const m = Math.floor(timeRemainingSec / 60);
    const s = Math.floor(timeRemainingSec % 60);
    this.timeText.text = `Time: ${m}:${s.toString().padStart(2, "0")}`;
    this.playerText.text = `Alive: ${currentAlive}/${totalStart}`;

    if (timeRemainingSec <= 30) this.timeText.style.fill = "#FF0000";
    else this.timeText.style.fill = "#FFFFFF";
  }

  showSpectating() {
    this.spectatingText.visible = true;
  }

  showGameOver(mainText: string, subText: string, color: string) {
    this.centerText.text = mainText;
    this.centerText.style.fill = color;
    this.centerText.visible = true;

    this.subCenterText.text = subText;
    this.subCenterText.visible = true;
  }

  updateLobbyTimer(seconds: number) {
    this.lobbyTimerText.text = `Exiting game in ${seconds}s`;
    this.lobbyTimerText.visible = true;
  }

  // Helper to keep HUD centered if window resizes
  resize(w: number, h: number) {
    this.spectatingText.x = w / 2;
    this.centerText.x = w / 2;
    this.centerText.y = h / 2 - 50;
    this.subCenterText.x = w / 2;
    this.subCenterText.y = h / 2 + 20;
    this.lobbyTimerText.y = h - 20;

    // ✅ Fix: Ensure powerUpText is repositioned too
    if (this.powerUpText) {
      this.powerUpText.x = w / 2;
      this.powerUpText.y = 80;
    }
  }

  update(dt: number) {
    if (this.powerUpTimeRemaining > 0) {
      this.powerUpTimeRemaining -= dt;
      const seconds = Math.ceil(this.powerUpTimeRemaining / 1000);
      this.powerUpText.text = `SPEED BOOST: ${seconds}s`;

      if (this.powerUpTimeRemaining <= 0) {
        this.powerUpText.visible = false;
      }
    }
  }

  public showPowerUpStatus(text: string, durationMs: number, color: number) {
    this.powerUpText.text = text;
    this.powerUpText.style.fill = color;
    this.powerUpTimeRemaining = durationMs;
    this.powerUpText.visible = true;
  }
}

import { Container, Text, TextStyle } from "pixi.js";

export class GameHUD extends Container {
  private timeText: Text;
  private playerText: Text;

  constructor() {
    super();

    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: "bold",
      fill: "#FFFFFF",
      stroke: { color: "#000000", width: 4 }, // v8 syntax
      align: "center",
    });

    // 1. Time Display (Top Left)
    this.timeText = new Text({ text: "Time: 5:00", style });
    this.timeText.x = 20;
    this.timeText.y = 20;
    this.addChild(this.timeText);

    // 2. Player Count Display (Below Time)
    this.playerText = new Text({ text: "Players: 0/0", style });
    this.playerText.x = 20;
    this.playerText.y = 55;
    this.addChild(this.playerText);
  }

  updateStats(timeRemainingSec: number, current: number, total: number) {
    // Format Time (MM:SS)
    const m = Math.floor(timeRemainingSec / 60);
    const s = Math.floor(timeRemainingSec % 60);
    const timeString = `${m}:${s.toString().padStart(2, "0")}`;

    this.timeText.text = `Time: ${timeString}`;
    this.playerText.text = `Players: ${current}/${total}`;

    // Color logic: Red if time is low or few players left
    if (timeRemainingSec <= 30) this.timeText.style.fill = "#FF0000";
    else this.timeText.style.fill = "#FFFFFF";
  }
}

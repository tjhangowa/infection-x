import { Container, Text, TextStyle } from "pixi.js";

export class ParryUI extends Container {
  private text: Text;

  constructor() {
    super();

    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 28,
      fontWeight: "bold",
      fill: "#00FF00", // Default Green
      // ✅ FIX: In PixiJS v8, stroke color and width are grouped
      stroke: { color: "#000000", width: 5 },
    });

    // ✅ FIX: PixiJS v8 uses an options object for Text constructor
    this.text = new Text({ text: "Parry: Ready!", style });
    this.text.anchor.set(1, 1); // Anchor to Bottom-Right
    this.addChild(this.text);
  }

  updateState(cooldownEnd: number) {
    const now = Date.now();
    const remaining = cooldownEnd - now;

    if (remaining <= 0) {
      this.text.text = "Parry: Ready!";
      this.text.style.fill = "#00FF00"; // Green
    } else {
      // Round up to nearest second
      const seconds = Math.ceil(remaining / 1000);
      this.text.text = `Parry: ${seconds}`;
      this.text.style.fill = "#FFFFFF"; // White
    }
  }
}

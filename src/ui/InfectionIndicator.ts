import * as PIXI from "pixi.js";

export class InfectionIndicator extends PIXI.Container {
  private graphics: PIXI.Graphics;
  private progress: number = 0; // 0 to 1

  constructor() {
    super();
    this.graphics = new PIXI.Graphics();
    this.addChild(this.graphics);
    this.visible = false;
  }

  // Call this every frame with a value between 0 and 1
  updateProgress(percent: number) {
    this.progress = Math.max(0, Math.min(1, percent));
    this.redraw();
  }

  show() {
    this.visible = true;
    this.progress = 0;
    this.redraw();
  }

  hide() {
    this.visible = false;
    this.graphics.clear();
  }

  private redraw() {
    this.graphics.clear();

    const radius = 20;
    const startAngle = -Math.PI / 2; // Start at top (12 o'clock)
    const endAngle = startAngle + Math.PI * 2 * this.progress;

    // 1. Draw Background (Dark Red)
    this.graphics.beginFill(0x550000, 0.6);
    this.graphics.drawCircle(0, 0, radius);
    this.graphics.endFill();

    // 2. Draw Progress Slice (Bright Red)
    if (this.progress > 0) {
      this.graphics.beginFill(0xff0000, 0.9);
      this.graphics.moveTo(0, 0); // Center
      this.graphics.arc(0, 0, radius, startAngle, endAngle);
      this.graphics.lineTo(0, 0); // Back to center
      this.graphics.endFill();
    }
  }
}

import { Container, Text, TextStyle } from "pixi.js";

export class CountdownUI extends Container {
  private textObj: Text;
  private _isMatchActive: boolean = false; // Prevents input/physics when false
  private matchStartTime: number = 0;

  constructor() {
    super();

    // 1. Define the Style here to keep Scene clean
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: 80,
      fontWeight: "bold",
      fill: 0xffffff,
      stroke: { color: "#000000", width: 6 }, // v8 syntax
      align: "center",
    });

    // 2. Create the Text Object
    this.textObj = new Text({ text: "", style });
    this.textObj.anchor.set(0.5);
    this.textObj.visible = false; // Hidden by default

    this.addChild(this.textObj);
  }

  /**
   * Called by the Socket event to set the start time
   */
  startTimer(delay: number) {
    // Calculate the target time based on CLIENT'S clock
    this.matchStartTime = Date.now() + delay;
    this._isMatchActive = false; // Reset state
    this.textObj.visible = true;
    this.textObj.style.fill = 0xffffff; // Reset color to white
  }

  /**
   * Called every frame by the Scene's update loop
   */
  update() {
    // If the match is already active and the text is gone, do nothing
    if (this._isMatchActive && !this.textObj.visible) return;

    const now = Date.now();
    const timeUntilStart = this.matchStartTime - now;

    if (timeUntilStart > 0) {
      // --- COUNTDOWN (3, 2, 1...) ---
      this._isMatchActive = false;
      this.textObj.visible = true;
      this.textObj.text = Math.ceil(timeUntilStart / 1000).toString();
    } else if (timeUntilStart > -1000) {
      // --- GO! (0 to -1 seconds) ---
      this._isMatchActive = true; // Allow movement now!
      this.textObj.text = "GO!";
      this.textObj.style.fill = 0x00ff00; // Green
    } else {
      // --- HIDE ---
      this.textObj.visible = false;
      this._isMatchActive = true;
    }
  }

  /**
   * Helper to center the text on screen resize
   */
  resize(screenWidth: number, screenHeight: number) {
    this.textObj.position.set(screenWidth / 2, screenHeight / 2);
  }

  /**
   * Public getter so GameMapScene knows if it should run physics/input
   */
  get isMatchActive(): boolean {
    return this._isMatchActive;
  }
}

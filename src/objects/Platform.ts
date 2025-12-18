import * as PIXI from "pixi.js";
import { Body } from "matter-js";
import { Terrain } from "./terrain/terrain";

export interface PlatformConfig {
  x: number;      // world-space center X
  y: number;      // world-space center Y
  width: number;
  height: number;
  color: number;
  rotation?: number;
}

export class Platform extends Terrain {
  public config: PlatformConfig;

  private selected = false;

  constructor(cfg: PlatformConfig,texture: PIXI.Texture) {
    super(texture, cfg.x, cfg.y, cfg.width, cfg.height);
    this.tag = "ground"

    // Ensure we always have a rotation value
    this.config = { rotation: 0, ...cfg };
  
    this.refreshFromConfig();
  }

  setSelected(selected: boolean) {
    this.selected = selected;
    this.applyVisualState();
  }

  /** Call after changing config.width/height/x/y/rotation if needed */
  refreshFromConfig() {
    const { x, y, rotation = 0 } = this.config;

    // Apply size first (so arrow-key resizing updates sprite + body)
    this.setSize(this.config.width, this.config.height);

    // Update display object
    this.position.set(x, y);
    this.rotation = rotation;

    // Update physics body transform
    Body.setPosition(this.body, { x, y });
    Body.setAngle(this.body, rotation);

    this.applyVisualState();
  }

  private applyVisualState() {
    if (this.selected) {
      this.sprite.tint = 0xffff00;
      this.sprite.alpha = 0.9;
    } else {
      this.sprite.tint = this.config.color;
      this.sprite.alpha = 1.0;
    }
  }
}
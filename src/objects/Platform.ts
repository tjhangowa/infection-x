import * as PIXI from "pixi.js";
import { Terrain } from "./terrain/terrain";

export interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
}

export class Platform extends Terrain {
  public config: PlatformConfig;
  private selected = false;

  constructor(cfg: PlatformConfig) {
    super(PIXI.Texture.WHITE, cfg.x, cfg.y, cfg.width, cfg.height);

    this.tag = "ground";
    this.config = cfg;

    this.sprite.tint = cfg.color;
    this.applyVisualState();
  }

  setSelected(selected: boolean) {
    this.selected = selected;
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

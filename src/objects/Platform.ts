import { Graphics } from "pixi.js";

export interface PlatformConfig {
  x: number;      // world-space center X
  y: number;      // world-space center Y
  width: number;
  height: number;
  color: number;
  rotation?: number;
}

export class Platform extends Graphics {
  config: PlatformConfig;
  private selected = false;

  constructor(cfg: PlatformConfig) {
    super();
    this.config = { ...cfg, rotation: cfg.rotation ?? 0 };

    this.refreshFromConfig();
  }

  setSelected(selected: boolean) {
    this.selected = selected;
    this.redraw();
  }

  /** Call after changing config.width/height/x/y if needed */
  refreshFromConfig() {
    this.x = this.config.x;
    this.y = this.config.y;
    this.rotation = this.config.rotation ?? 0;
    this.redraw();
  }

  private redraw() {
    this.clear();

    const { width, height, color } = this.config;
    const halfW = width / 2;
    const halfH = height / 2;

    if (this.selected) {
      // Slight outline when selected
      this.rect(-halfW - 3, -halfH - 3, width + 6, height + 6).fill(0xffff00);
      this.rect(-halfW, -halfH, width, height).fill(color);
    } else {
      this.rect(-halfW, -halfH, width, height).fill(color);
    }
  }
}
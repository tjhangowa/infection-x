import { Container } from "pixi.js";

export class Camera2D {
  private world: Container;
  private target: { x: number; y: number };

  zoom = 1.25;
  smoothness = 0.12;

  enabled = true;

  constructor(world: Container, target: { x: number; y: number }) {
    this.world = world;
    this.target = target;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;

    // Reset world transform so entire map is visible
    this.world.scale.set(1);
    this.world.position.set(0, 0);
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  update(screenW: number, screenH: number, mapW: number, mapH: number) {
    if (!this.enabled) return;

    this.world.scale.set(this.zoom);

    const targetX = -this.target.x * this.zoom + screenW / 2;
    const targetY = -this.target.y * this.zoom + screenH / 2;

    const minX = screenW - mapW * this.zoom;
    const maxX = 0;

    const minY = screenH - mapH * this.zoom;
    const maxY = 0;

    this.world.x +=
      (Math.min(maxX, Math.max(minX, targetX)) - this.world.x) *
      this.smoothness;

    this.world.y +=
      (Math.min(maxY, Math.max(minY, targetY)) - this.world.y) *
      this.smoothness;
  }
}

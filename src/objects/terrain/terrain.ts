import * as PIXI from "pixi.js";
import { Bodies, Body } from "matter-js";

const MIN_COLLIDER_THICKNESS = 32;

export abstract class Terrain extends PIXI.Container {
  tag: "ground" | "wall" | "platform" = "ground";
  sprite: PIXI.Sprite;
  body: Body;

  constructor(
    texture: PIXI.Texture,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    super();

    // ---- Visual ----
    this.sprite = new PIXI.Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.sprite.width = width;
    this.sprite.height = height;
    this.addChild(this.sprite);

    // ---- Physics (thicker, SAME center) ----
    const colliderHeight = Math.max(height, MIN_COLLIDER_THICKNESS);

    this.body = Bodies.rectangle(x, y, width, colliderHeight, {
      isStatic: true,
      friction: 0,
      frictionStatic: 0,
      restitution: 0,
      slop: 0,
    });

    this.position.set(x, y);
  }

  update() {
    // Sync position ONLY — never offset
    this.position.set(this.body.position.x, this.body.position.y);

    // NEVER sync rotation from physics
  }
}

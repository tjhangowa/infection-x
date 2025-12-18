import { Container, Sprite, Texture } from "pixi.js";
import { Body, Bodies } from "matter-js";
import { PowerUpType } from "./PowerUpTypes";
import type { PlayerActor } from "../actors/PlayerActor";

export interface PowerUpConfig {
  x: number;
  y: number;

  // For pickup area. Keep it simple as a circle sensor.
  radius?: number;

  // Optional: how long the effect lasts (ms). Cure might ignore this.
  durationMs?: number;

  // Optional: render scale
  scale?: number;
}

/**
 * Base PowerUp:
 * - Has a Pixi sprite (visual)
 * - Has a Matter sensor body (pickup detection)
 *
 * Pickup logic hookup can be done later in the scene (without CollisionManager changes)
 * by checking overlaps vs the player body.
 */
export abstract class PowerUp extends Container {
  public readonly type: PowerUpType;
  public readonly body: Body;

  protected readonly sprite: Sprite;
  protected readonly durationMs: number;

  public isConsumed = false;

  constructor(type: PowerUpType, texture: Texture, cfg: PowerUpConfig) {
    super();

    this.type = type;
    this.durationMs = cfg.durationMs ?? 0;

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    const scale = cfg.scale ?? 1;
    this.sprite.scale.set(scale);
    this.addChild(this.sprite);

    const radius = cfg.radius ?? Math.max(this.sprite.width, this.sprite.height) * 0.5;

    // Sensor body: detects overlap but doesn't physically push the player.
    this.body = Bodies.circle(cfg.x, cfg.y, radius, {
      isStatic: true,
      isSensor: true,
      friction: 0,
      restitution: 0,
    });

    this.position.set(cfg.x, cfg.y);
  }

  /** Called when player picks it up. Derived classes implement the effect. */
  abstract apply(player: PlayerActor): void;

  /**
   * Called when effect ends (only relevant if durationMs > 0).
   * Speed/Invisibility will likely use this.
   */
  abstract remove(player: PlayerActor): void;

  /**
   * Use this helper when the powerup is picked up:
   * - marks consumed
   * - hides sprite (scene can also remove + destroy)
   */
  consume() {
    this.isConsumed = true;
    this.visible = false;
  }

  /** Optional: expose duration to your manager later */
  getDurationMs() {
    return this.durationMs;
  }
}
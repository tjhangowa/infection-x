import { Container, AnimatedSprite, Spritesheet } from "pixi.js";
import { Body, Bodies } from "matter-js";
import { PowerUpType } from "./PowerUpTypes";

// ✅ 1. Add 'onPickup' to the Base Hooks
export interface PowerUpHooks {
  onPickup?: () => void; // Optional hook for networking
}
export interface PowerUpConfig {
  x: number;
  y: number;
  id?: string;
  radius?: number; // Hitbox size (optional)
  durationMs?: number; // Effect duration
  scale?: number; // Visual scale
  animationSpeed?: number;
  hooks?: PowerUpHooks;
}

export abstract class PowerUp extends Container {
  public readonly type: PowerUpType;

  // body/sprite are definitely assigned in initSprite, so we use ! assertion
  public body!: Body;
  protected sprite!: AnimatedSprite;

  protected readonly durationMs: number;
  public isConsumed = false;

  // ✅ FIX 3: Add public ID and hooks storage
  public id: string;
  protected hooks: PowerUpHooks;

  // Stored config to be used in initSprite
  protected config: PowerUpConfig;

  // Abstract getters
  protected abstract get sheet(): Spritesheet;
  protected abstract get animationName(): string;

  constructor(type: PowerUpType, cfg: PowerUpConfig) {
    super();
    this.type = type;
    this.config = cfg;
    this.durationMs = cfg.durationMs ?? 0;
    // ✅ FIX 4: Initialize ID and Hooks
    this.id = cfg.id || Math.random().toString(36).substr(2, 9);
    this.hooks = cfg.hooks || {};
  }

  /**
   * Must be called by the Child class at the end of its constructor.
   */
  protected initSprite() {
    // 1. Get Frames
    const frames = this.sheet.animations[this.animationName];
    if (!frames) {
      throw new Error(
        `Animation "${this.animationName}" not found in sheet for ${this.type}`,
      );
    }

    // 2. Create Sprite
    this.sprite = new AnimatedSprite(frames);
    this.sprite.animationSpeed = this.config.animationSpeed ?? 0.15;
    this.sprite.anchor.set(0.5);
    this.sprite.play(); // This starts the loop automatically!

    const scale = this.config.scale ?? 1;
    this.sprite.scale.set(scale);
    this.addChild(this.sprite);

    // 3. Create Physics Body
    const radius = this.config.radius ?? 30;

    this.body = Bodies.circle(this.config.x, this.config.y, radius, {
      isStatic: true,
      isSensor: true,
      label: "powerup",
    });

    // Initial position sync
    this.position.set(this.config.x, this.config.y);
  }

  // Abstract Logic - No arguments needed (handled via hooks)
  abstract apply(): void;
  abstract remove(): void;

  consume() {
    this.isConsumed = true;
    this.visible = false;
    if (this.hooks.onPickup) {
      this.hooks.onPickup();
    }
  }

  getDurationMs() {
    return this.durationMs;
  }
}

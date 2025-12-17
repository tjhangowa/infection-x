import { Assets, Spritesheet } from "pixi.js";
import { PowerUp, PowerUpConfig, PowerUpHooks } from "../base/PowerUp";
import { PowerUpType } from "../base/PowerUpTypes";

// ✅ 1. Extend Base Config to include ID (It does this automatically if you extend PowerUpConfig)
export interface SpeedPowerUpConfig extends PowerUpConfig {
  scale: number;
  hooks: SpeedHooks;
  multiplier?: number;
}

// ✅ 2. Extend Base Hooks to include 'onPickup'
export interface SpeedHooks extends PowerUpHooks {
  getSpeed: () => number;
  setSpeed: (v: number) => void;
}

export class SpeedPowerUp extends PowerUp {
  // ✅ Static sheet storage (Like Tom.ts)
  private static _sheet: Spritesheet;

  static async loadAssets() {
    if (SpeedPowerUp._sheet) return;
    SpeedPowerUp._sheet = await Assets.load(
      "assets/powerupsfinalized/speedpowerup.json",
    );
  }

  // ✅ Getter implementation
  protected get sheet(): Spritesheet {
    if (!SpeedPowerUp._sheet) {
      throw new Error(
        "SpeedPowerUp assets not loaded! Call loadAssets() first.",
      );
    }
    return SpeedPowerUp._sheet;
  }

  // ✅ Define the specific animation key here
  protected get animationName(): string {
    return "idle";
  }

  private multiplier: number;
  protected hooks: SpeedHooks;
  private previousSpeed: number | null = null;

  constructor(cfg: SpeedPowerUpConfig) {
    // We don't pass textures anymore, just config!
    super(PowerUpType.Speed, cfg);
    this.multiplier = cfg.multiplier ?? 1.5;
    this.hooks = cfg.hooks;
    this.initSprite();
  }

  apply() {
    if (this.isConsumed) return;
    this.previousSpeed = this.hooks.getSpeed();
    this.hooks.setSpeed(this.previousSpeed * this.multiplier);
    this.consume();
  }

  remove() {
    if (this.previousSpeed === null) return;
    this.hooks.setSpeed(this.previousSpeed);
    this.previousSpeed = null;
  }
}

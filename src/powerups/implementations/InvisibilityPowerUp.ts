import { Assets, Spritesheet } from "pixi.js";
import { PowerUp, PowerUpConfig, PowerUpHooks } from "../base/PowerUp";
import { PowerUpType } from "../base/PowerUpTypes";

// ✅ 1. Update Config Interface
export interface InvisPowerUpConfig extends PowerUpConfig {
  hooks: InvisHooks;
  targetAlpha?: number;
}

// ✅ 2. Update Hooks Interface
export interface InvisHooks extends PowerUpHooks {
  setAlpha: (a: number) => void;
  setIsInvisible: (b: boolean) => void;
}

export class InvisibilityPowerUp extends PowerUp {
  private static _sheet: Spritesheet;

  static async loadAssets() {
    if (InvisibilityPowerUp._sheet) return;
    InvisibilityPowerUp._sheet = await Assets.load(
      "assets/powerupsfinalized/invisibilitypowerup.json",
    );
  }

  protected get sheet(): Spritesheet {
    if (!InvisibilityPowerUp._sheet)
      throw new Error("Invisibility assets not loaded!");
    return InvisibilityPowerUp._sheet;
  }

  protected get animationName(): string {
    return "idle";
  }

  protected hooks: InvisHooks;
  private targetAlpha: number;

  constructor(cfg: InvisPowerUpConfig) {
    super(PowerUpType.Invisibility, cfg);
    this.hooks = cfg.hooks;
    this.targetAlpha = cfg.targetAlpha ?? 0.5;
    this.initSprite();
  }

  apply() {
    if (this.isConsumed) return;
    this.hooks.setAlpha(this.targetAlpha);
    this.hooks.setIsInvisible(true);
    this.consume();
  }

  remove() {
    this.hooks.setAlpha(1.0);
    this.hooks.setIsInvisible(false);
  }
}

import { Texture } from "pixi.js";
import { PowerUp, type PowerUpConfig } from "../PowerUp";
import { PowerUpType } from "../PowerUpTypes";
import type { PlayerActor } from "../../actors/PlayerActor";

type SpeedHooks = {
  // Get the current move speed (scene-owned)
  getSpeed: () => number;

  // Set the move speed (scene-owned)
  setSpeed: (value: number) => void;
};

export interface SpeedPowerUpConfig extends PowerUpConfig {
  multiplier?: number; // default 1.5
  hooks: SpeedHooks;
}

export class SpeedPowerUp extends PowerUp {
  private multiplier: number;
  private hooks: SpeedHooks;

  // store what we changed so we can reliably revert
  private previousSpeed: number | null = null;

  constructor(texture: Texture, cfg: SpeedPowerUpConfig) {
    super(PowerUpType.Speed, texture, cfg);

    this.multiplier = cfg.multiplier ?? 1.5;
    this.hooks = cfg.hooks;

    // Speed should generally have a duration
    // (but you can still allow durationMs=0 for debugging)
  }

  apply(_player: PlayerActor) {
    if (this.isConsumed) return;

    this.previousSpeed = this.hooks.getSpeed();
    this.hooks.setSpeed(this.previousSpeed * this.multiplier);

    this.consume();
  }

  remove(_player: PlayerActor) {
    if (this.previousSpeed === null) return;
    this.hooks.setSpeed(this.previousSpeed);
    this.previousSpeed = null;
  }
}
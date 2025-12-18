import { Texture } from "pixi.js";
import { PowerUp, type PowerUpConfig } from "../PowerUp";
import { PowerUpType } from "../PowerUpTypes";
import type { PlayerActor } from "../../actors/PlayerActor";

// Keep this local so we don't depend on network socket types
export type CharacterType = "tom" | "jenny" | "mike" | "infected";

type CureHooks = {
  /** Should return whether the player is ACTUALLY infected (not visually disguised). */
  isActuallyInfected: () => boolean;

  /** Add one stored cure charge for the local player. */
  addCureCharge: (amount?: number) => void;
};

export interface CurePowerUpConfig extends PowerUpConfig {
  hooks: CureHooks;
}

/**
 * Cure pickup (stored item):
 * - Only meaningful for humans.
 * - When picked up by a human, it adds a stored cure charge.
 * - It does NOT immediately affect anyone; using the cure happens elsewhere (e.g., key press).
 */
export class CurePowerUp extends PowerUp {
  private hooks: CureHooks;

  constructor(texture: Texture, cfg: CurePowerUpConfig) {
    super(PowerUpType.Cure, texture, cfg);
    this.hooks = cfg.hooks;
  }

  apply(_player: PlayerActor) {
    if (this.isConsumed) return;

    // Infected can't store cures (consume does nothing but removes pickup)
    if (!this.hooks.isActuallyInfected()) {
      this.hooks.addCureCharge(1);
    }

    this.consume();
  }

  remove(_player: PlayerActor) {
    // No timed removal for stored cures.
  }
}
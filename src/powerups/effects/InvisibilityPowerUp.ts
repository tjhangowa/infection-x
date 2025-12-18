import { Texture } from "pixi.js";
import { PowerUp, type PowerUpConfig } from "../PowerUp";
import { PowerUpType } from "../PowerUpTypes";
import type { PlayerActor } from "../../actors/PlayerActor";

// Keep this local so we don't depend on your network socket types
export type CharacterType = "tom" | "jenny" | "mike" | "infected";

type InvisibilityHooks = {
  //Return the player's CURRENT character type (what they're visually showing right now).
  getCharacterType: () => CharacterType;

  // Swap the player's VISUAL character type (should not change physics body)
  setCharacterType: (type: CharacterType) => void;

  //choose which human sprite an infected disguises as. 
  getHumanDisguiseType?: () => Exclude<CharacterType, "infected">;
};

export interface InvisibilityPowerUpConfig extends PowerUpConfig {
  hooks: InvisibilityHooks;
}

/**
 * Invisibility / Disguise powerup:
 * - If you're infected, you LOOK like a human for a short duration.
 * - If you're human, you LOOK infected for a short duration.
 *
 * Important:
 * This is purely visual deception. Server-side team/faction should NOT change.
 */
export class InvisibilityPowerUp extends PowerUp {
  private hooks: InvisibilityHooks;

  // what we changed so we can revert reliably
  private previousType: CharacterType | null = null;

  constructor(texture: Texture, cfg: InvisibilityPowerUpConfig) {
    super(PowerUpType.Invisibility, texture, cfg);
    this.hooks = cfg.hooks;
  }

  apply(_player: PlayerActor) {
    if (this.isConsumed) return;

    const current = this.hooks.getCharacterType();
    this.previousType = current;

    // Disguise as the opposite side
    let disguise: CharacterType;
    if (current === "infected") {
      disguise = this.hooks.getHumanDisguiseType?.() ?? "tom";
    } else {
      disguise = "infected";
    }

    this.hooks.setCharacterType(disguise);
    this.consume();
  }

  remove(_player: PlayerActor) {
    if (this.previousType === null) return;

    this.hooks.setCharacterType(this.previousType);
    this.previousType = null;
  }
}

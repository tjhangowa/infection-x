import { Container } from "pixi.js";
import { Engine, World, Query } from "matter-js";
import type { PlayerActor } from "../actors/PlayerActor";
import type { PowerUp } from "../powerups/base/PowerUp";

type ActiveTimedPowerUp = {
  powerUp: PowerUp;
  expiresAtMs: number;
};

export class PowerUpManager {
  private engine: Engine;
  private sceneWorld: Container;
  private player: PlayerActor;

  // Items currently on the ground
  private powerUps: PowerUp[] = [];

  // Items currently active on the player (waiting to expire)
  private activeTimed: ActiveTimedPowerUp[] = [];

  constructor(engine: Engine, sceneWorld: Container, player: PlayerActor) {
    this.engine = engine;
    this.sceneWorld = sceneWorld;
    this.player = player;
  }

  add(powerUp: PowerUp) {
    // Add to Pixi (visuals) and Matter (physics)
    this.sceneWorld.addChild(powerUp);
    World.add(this.engine.world, powerUp.body);

    this.powerUps.push(powerUp);
  }
  remove(identifier: PowerUp | string) {
    let powerUpToRemove: PowerUp | undefined;

    // 1. Find the specific PowerUp instance
    if (typeof identifier === "string") {
      powerUpToRemove = this.powerUps.find((p) => p.id === identifier);
    } else {
      powerUpToRemove = identifier;
    }

    // If not found, exit
    if (!powerUpToRemove) return;

    // 2. Remove from Pixi
    if (powerUpToRemove.parent)
      powerUpToRemove.parent.removeChild(powerUpToRemove);

    // 3. Remove from Matter
    World.remove(this.engine.world, powerUpToRemove.body);

    // 4. Remove from our tracking list
    this.powerUps = this.powerUps.filter((p) => p !== powerUpToRemove);
  }

  /**
   * Call once per frame from the Scene.
   * _dtMs: elapsed milliseconds since last update (underscored because unused)
   * nowMs: pass performance.now() (or Date.now()) for predictable durations
   */
  update(_dtMs: number, nowMs: number) {
    this.checkPickups(nowMs);
    this.updateDurations(nowMs);

    // Note: We don't need a loop to play animations here.
    // Pixi AnimatedSprite loops automatically once .play() is called in initSprite().
  }

  private checkPickups(nowMs: number) {
    const playerBody = this.player.body;

    // Quick exit if no powerups or player dead
    if (!playerBody || this.powerUps.length === 0) return;

    // Iterate over a copy so we can safely remove items during the loop
    for (const p of [...this.powerUps]) {
      if (p.isConsumed) continue;

      // Check collision between Player and PowerUp Sensor
      const hits = Query.collides(playerBody, [p.body]);
      if (hits.length === 0) continue;

      // 1. Apply Effect (No arguments, uses hooks)
      p.apply();

      // 2. Remove from the ground immediately
      this.remove(p);

      // 3. If it has duration, track it in the active list
      const duration = p.getDurationMs();
      if (duration > 0) {
        this.activeTimed.push({
          powerUp: p,
          expiresAtMs: nowMs + duration,
        });
      }
    }
  }

  private updateDurations(nowMs: number) {
    if (this.activeTimed.length === 0) return;

    const stillActive: ActiveTimedPowerUp[] = [];

    for (const entry of this.activeTimed) {
      if (nowMs >= entry.expiresAtMs) {
        // Time is up -> Revert changes
        entry.powerUp.remove();
      } else {
        stillActive.push(entry);
      }
    }

    this.activeTimed = stillActive;
  }
}

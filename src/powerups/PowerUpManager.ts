import { Container, Texture } from "pixi.js";
import { Engine, World, Query } from "matter-js";
import type { PlayerActor } from "../actors/PlayerActor";
import type { PowerUp } from "./PowerUp";
import { PowerUpType } from "./PowerUpTypes";
import { SpeedPowerUp } from "./effects/SpeedPowerUp";

// Network payload for a spawned powerup (server-authoritative)
export type PowerUpSpawnPayload = {
  id: string; // unique server id
  type: PowerUpType;
  x: number;
  y: number;
  durationMs?: number;
  // effect-specific params (optional)
  multiplier?: number;
};

type ActiveTimedPowerUp = {
  id: string;
  powerUp: PowerUp;
  expiresAtMs: number;
};

// Minimal socket shape so we don't import socket.io-client types
export type PowerUpSocket = {
  on: (event: string, cb: (...args: any[]) => void) => void;
  emit: (event: string, payload?: any) => void;
};

type SpeedHooks = {
  getSpeed: () => number;
  setSpeed: (value: number) => void;
};

export class PowerUpManager {
  private engine: Engine;
  private sceneWorld: Container;
  private player: PlayerActor;

  private powerUps: PowerUp[] = [];
  private activeTimed: ActiveTimedPowerUp[] = [];

  // one active per type (your no-stacking rule)
  private activeTypes = new Set<PowerUpType>();

  // server id -> local powerup instance
  private byId = new Map<string, PowerUp>();

  // optional networking
  private socket?: PowerUpSocket;

  // assets / hooks used by factory
  private texturesByType: Partial<Record<PowerUpType, Texture>> = {};
  private speedHooks?: SpeedHooks;

  // optional: allow scene to control pickup scale per type
  private scaleByType: Partial<Record<PowerUpType, number>> = {};

  constructor(engine: Engine, sceneWorld: Container, player: PlayerActor) {
    this.engine = engine;
    this.sceneWorld = sceneWorld;
    this.player = player;
  }

  /**
   * Configure textures + hooks needed to instantiate powerups.
   * Call this once from the scene after Assets.load(...).
   */
  configure(opts: {
    texturesByType: Partial<Record<PowerUpType, Texture>>;
    speedHooks?: SpeedHooks;
    scaleByType?: Partial<Record<PowerUpType, number>>;
  }) {
    this.texturesByType = opts.texturesByType;
    this.speedHooks = opts.speedHooks;
    this.scaleByType = opts.scaleByType ?? {};
  }

  /**
   * Optional: enable network-driven spawning.
   * Server should emit:
   * - `powerups` => Record<string, PowerUpSpawnPayload>
   * - `powerupSpawned` => PowerUpSpawnPayload
   * - `powerupConsumed` => { id: string }
   */
  enableNetworking(socket: PowerUpSocket) {
    this.socket = socket;

    socket.on("powerups", (powerups: Record<string, PowerUpSpawnPayload>) => {
      // full sync on join
      for (const id in powerups) {
        this.spawnFromPayload(powerups[id]);
      }
    });

    socket.on("powerupSpawned", (payload: PowerUpSpawnPayload) => {
      this.spawnFromPayload(payload);
    });

    socket.on("powerupConsumed", (data: { id: string }) => {
      this.removeById(data.id);
    });
  }

  /** Local spawn (can also be called by scene for single-player testing). */
  spawnFromPayload(payload: PowerUpSpawnPayload) {
    if (!payload?.id) return;
    if (this.byId.has(payload.id)) return;

    const pu = this.createInstance(payload);
    if (!pu) return;

    this.byId.set(payload.id, pu);
    this.add(pu);
  }

  /** Remove a powerup by server id (used by networking). */
  removeById(id: string) {
    const pu = this.byId.get(id);
    if (!pu) return;

    this.byId.delete(id);
    this.remove(pu);
  }

  /**
   * Render + physics add for a PowerUp instance.
   * (kept public so scene can still add custom powerups in tests)
   */
  add(powerUp: PowerUp) {
    this.sceneWorld.addChild(powerUp);
    World.add(this.engine.world, powerUp.body);
    this.powerUps.push(powerUp);
  }

  /** Remove a PowerUp instance. */
  remove(powerUp: PowerUp) {
    if (powerUp.parent) powerUp.parent.removeChild(powerUp);
    World.remove(this.engine.world, powerUp.body);
    this.powerUps = this.powerUps.filter((p) => p !== powerUp);
  }

  /** Call once per frame from the Scene. */
  update(dtMs: number, nowMs: number) {
    this.checkPickups(nowMs);
    this.updateDurations(nowMs);
    void dtMs;
  }

  private checkPickups(nowMs: number) {
    const playerBody = this.player.body;
    if (!playerBody || this.powerUps.length === 0) return;

    for (const p of [...this.powerUps]) {
      if (p.isConsumed) continue;

      const hits = Query.collides(playerBody, [p.body]);
      if (hits.length === 0) continue;

      // No stacking per type
      if (this.activeTypes.has(p.type)) continue;

      // Apply
      p.apply(this.player);
      this.activeTypes.add(p.type);

      // If networking is enabled, notify server so other clients remove it
      // (Server should validate + broadcast powerupConsumed)
      const id = this.findIdForInstance(p);
      if (this.socket && id) {
        this.socket.emit("consumePowerup", { id });
      }

      // Remove locally right away (responsive pickup)
      this.remove(p);

      // If it has duration, track for removal later
      const duration = p.getDurationMs();
      if (duration > 0) {
        this.activeTimed.push({
          id: id ?? "",
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
        entry.powerUp.remove(this.player);
        this.activeTypes.delete(entry.powerUp.type);
      } else {
        stillActive.push(entry);
      }
    }

    this.activeTimed = stillActive;
  }

  private findIdForInstance(pu: PowerUp): string | null {
    for (const [id, inst] of this.byId.entries()) {
      if (inst === pu) return id;
    }
    return null;
  }

  /** Factory: maps payload -> concrete PowerUp class. */
  private createInstance(payload: PowerUpSpawnPayload): PowerUp | null {
    const scale = this.scaleByType[payload.type] ?? 1;

    if (payload.type === PowerUpType.Speed) {
      const tex = this.texturesByType[PowerUpType.Speed];
      if (!tex) {
        console.warn("Missing texture for Speed powerup");
        return null;
      }
      if (!this.speedHooks) {
        console.warn("Missing speedHooks for Speed powerup");
        return null;
      }

      return new SpeedPowerUp(tex, {
        x: payload.x,
        y: payload.y,
        durationMs: payload.durationMs ?? 5000,
        scale,
        multiplier: payload.multiplier ?? 1.7,
        hooks: this.speedHooks,
      });
    }

    // Future:
    // - PowerUpType.Invisibility -> InvisibilityPowerUp
    // - PowerUpType.Cure -> CurePowerUp

    console.warn("Unsupported powerup type:", payload.type);
    return null;
  }
}
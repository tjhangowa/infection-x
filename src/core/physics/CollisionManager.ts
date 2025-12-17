import Matter, { Engine, Events, Body } from "matter-js";
import { Ground } from "../../objects/terrain/ground";
import { Wall } from "../../objects/terrain/wall";
import { PlayerActor } from "../../actors/PlayerActor";

type Collidable = PlayerActor | Ground | Wall;

export class CollisionManager {
  private bodyToObject = new Map<Body, Collidable>();
  private engine: Engine;

  constructor(engine: Engine) {
    this.engine = engine;

    // 1. Reset flags every frame
    Events.on(this.engine, "beforeUpdate", this.resetFlags);

    // 2. Listen for BOTH Start and Active
    // (Sometimes 'Active' skips a frame if the body is sleepy, Start helps catch the initial landing)
    Events.on(this.engine, "collisionStart", this.handleCollisions);
    Events.on(this.engine, "collisionActive", this.handleCollisions);
  }

  registerObject(obj: Collidable) {
    this.bodyToObject.set(obj.body, obj);
  }

  private resetFlags = () => {
    for (const obj of this.bodyToObject.values()) {
      if (obj instanceof PlayerActor) {
        obj.isGrounded = false;
        obj.isTouchingWall = false;
      }
    }
  };

  private handleCollisions = (event: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of event.pairs) {
      const a = this.bodyToObject.get(pair.bodyA);
      const b = this.bodyToObject.get(pair.bodyB);

      if (!a || !b) continue;

      const normal = pair.collision.normal;

      // Handle Player collisions (Order Independent)
      if (a instanceof PlayerActor) {
        this.resolvePlayerCollision(a, b, { x: -normal.x, y: -normal.y });
      } else if (b instanceof PlayerActor) {
        this.resolvePlayerCollision(b, a, normal);
      }
    }
  };

  private resolvePlayerCollision(
    player: PlayerActor,
    other: Collidable,
    normal: Matter.Vector,
  ) {
    // We only care if 'other' has a tag (is Terrain)
    if (!("tag" in other)) return;

    // 1. POSITION CHECK (Bulletproof)
    // In Pixi/Matter, lower Y value = Higher up on screen.
    // If Player Y < Other Y, the player is physically ON TOP of the object.
    const isPlayerAbove = player.body.position.y < other.body.position.y;

    // 2. VERTICAL CHECK
    // We don't care if it's 1.0 or -1.0, just that it's a vertical surface
    const isVerticalCollision = Math.abs(normal.y) > 0.5;

    // --- DEBUG LOG (Keep this until it works) ---
    // console.log(`HIT: ${other.tag} | Above: ${isPlayerAbove} | Vert: ${isVerticalCollision} | VY: ${player.body.velocity.y.toFixed(2)}`);

    // 1. GROUND CHECK
    if (
      (other.tag === "ground" || other.tag === "platform") &&
      isPlayerAbove && // ✅ Player is on top
      isVerticalCollision && // ✅ Surface is flat
      player.body.velocity.y >= -5 // ✅ Not moving up rapidly
    ) {
      player.isGrounded = true;
      // console.log("✅ GROUNDED TRUE");
    }

    // 2. WALL CHECK
    if (
      (other.tag === "wall" || other.tag === "ground") &&
      Math.abs(normal.x) > 0.5 // Hit from the side
    ) {
      player.isTouchingWall = true;
    }
  }
}

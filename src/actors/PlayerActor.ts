import { Body, Bodies } from "matter-js";
import { BaseCharacter } from "../characters/BaseCharacter";
import { InfectionIndicator } from "../ui/InfectionIndicator";

export class PlayerActor {
  public sprite: BaseCharacter;
  public body: Body;
  public infectionIndicator: InfectionIndicator;

  // collision flags
  public isGrounded = false;
  public isTouchingWall = false;
  // public wallDirection = direction.None;
  public isFrozen = false;
  public parryCooldownEnd = 0;
  // ✅ NEW: Jump Counter
  public jumpsRemaining = 0;
  public moveSpeed: number = 5;
  public isInvisible: boolean = false;

  constructor(sprite: BaseCharacter, x: number, y: number) {
    this.sprite = sprite;
    this.sprite.x = x;
    this.sprite.y = y;

    // ✅ NEW: Add Indicator
    this.infectionIndicator = new InfectionIndicator();
    this.infectionIndicator.y = -60; // Position above head
    this.sprite.addChild(this.infectionIndicator);

    this.body = Bodies.rectangle(x, y, 20, 36, {
      chamfer: { radius: 10 },
      friction: 0,
      frictionStatic: 0,
      restitution: 0,
      // slop: 0,
      inertia: Infinity,
      isSleeping: false,
      label: "player",
    });
    Body.set(this.body, "isSleeping", false);
  }

  syncFromPhysics() {
    this.sprite.x = this.body.position.x;
    this.sprite.y = this.body.position.y;
    // const HALF_HEIGHT = 36 / 2;
    // const targetY = this.body.position.y - HALF_HEIGHT;
    // const dy = targetY - this.sprite.y;
  }
  // ✅ NEW: Helpers
  canParry(): boolean {
    return Date.now() > this.parryCooldownEnd;
  }
  freeze(durationMs: number) {
    this.isFrozen = true;
    this.sprite.setTint(0x0000ff); // Visual blue tint

    setTimeout(() => {
      this.isFrozen = false;
      this.sprite.setTint(0xffffff); // Reset
    }, durationMs);
    // if (Math.abs(dy) > 0.01) {
    // this.sprite.y += dy * 0.35;
    // }
  }
  // ✅ NEW: Visual Effects
  public setTint(color: number) {
    this.sprite.tint = color;
  }

  public clearTint() {
    this.sprite.tint = 0xffffff; // White = No Tint
  }
}

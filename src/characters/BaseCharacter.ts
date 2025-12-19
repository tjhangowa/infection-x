import { AnimatedSprite, Container, Spritesheet } from "pixi.js";

export class BaseCharacter extends Container {
  protected sprite!: AnimatedSprite;
  private currentAnim = "";

  protected get sheet(): Spritesheet {
    throw new Error("Subclass must implement sheet getter");
  }

  constructor(defaultAnim: string) {
    super();

    const sheet = this.sheet;

    this.sprite = new AnimatedSprite(sheet.animations[defaultAnim]);
    this.sprite.animationSpeed = 0.12;
    this.sprite.anchor.set(0.5);
    this.currentAnim = defaultAnim;
    this.sprite.play();

    this.addChild(this.sprite);
  }

  playAnimation(animName: string): void {
    if (this.currentAnim === animName) return;

    const frames = this.sheet.animations[animName];
    if (!frames) {
      console.warn("No animation:", animName);
      return;
    }

    this.currentAnim = animName;
    this.sprite.textures = frames;
    this.sprite.play();
  }
  // ✅ ADD THIS METHOD
  public setTint(color: number) {
    if (this.sprite) {
      this.sprite.tint = color;
    }
  }
}

import { Container, Sprite, Assets, Graphics, Ticker } from "pixi.js";
import { BaseScene } from "./BaseScene";
import { App } from "../core/app";
import { Platform } from "../objects/Platform";
import { Engine, World, Bodies, Body } from "matter-js";

type PlatformConfigJson = {
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  color: number;
  rotation?: number;
};
export class GameMapScene extends BaseScene {
  private world!: Container;
  private mapSprite!: Sprite;

  private playerGraphics!: Graphics;
  private playerBody!: Body;

  private platforms: Platform[] = [];
  private platformConfigData: PlatformConfigJson[] = [];
  private physicsEngine!: Engine;

  private keys = new Set<string>();
  private readonly moveSpeed = 5;

  private resizeHandler = () => this.layout();
  private tickerFn = (ticker: Ticker) => this.update(ticker.deltaTime);

  constructor() {
    super();
  }

  async load() {
    // World container that will be moved as the "camera"
    this.world = new Container();
    this.addChild(this.world);

    // Load map background
    const texture = await Assets.load("/assets/Maps/gamemap.jpg");
    this.mapSprite = new Sprite(texture);
    this.mapSprite.anchor.set(0); // top-left
    this.world.addChild(this.mapSprite);

    // Load platform configuration from JSON
    await this.loadPlatformConfig();

    // Matter.js engine
    this.physicsEngine = Engine.create({
      gravity: { x: 0, y: 1 },
    });

    // Player and platforms
    this.createPlayer(texture.width, texture.height);
    this.createPlatforms();

    // Input + ticker
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.resizeHandler);

    App.pixi.ticker.add(this.tickerFn);

    // Initial camera layout
    this.layout();
    console.log("using gamemapscene");
  }

  // ----- Setup helpers -----

  private async loadPlatformConfig() {
    try {
      const res = await fetch("/config/demoMapPlatforms.json");
      if (!res.ok) {
        console.error(
          "Failed to load platform config JSON",
          res.status,
          res.statusText
        );
        this.platformConfigData = [];
        return;
      }

      const data = (await res.json()) as PlatformConfigJson[];
      this.platformConfigData = data;
      console.log("Loaded platform config");
    } catch (err) {
      console.error("Error loading platform config JSON", err);
      this.platformConfigData = [];
    }
  }
  private createPlatforms() {
    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;

    for (const cfg of this.platformConfigData) {
      const p = new Platform({
        x: cfg.xRatio * mapW,
        y: cfg.yRatio * mapH,
        width: cfg.wRatio * mapW,
        height: cfg.hRatio * mapH,
        color: cfg.color,
        rotation: cfg.rotation ?? 0,
      });

      this.platforms.push(p);
      this.world.addChild(p);

      if (this.physicsEngine) {
        World.add(this.physicsEngine.world, p.body);
      }
    }
  }

  private createPlayer(mapWidth: number, mapHeight: number) {
    const radius = 18;

    this.playerGraphics = new Graphics();
    this.playerGraphics.circle(0, 0, radius).fill(0x00ff00);
    this.playerGraphics.position.set(mapWidth / 2, mapHeight / 2);
    this.world.addChild(this.playerGraphics);

    const playerOptions: Matter.IChamferableBodyDefinition = {
      friction: 0.1,
      restitution: 0,
    };

    this.playerBody = Bodies.circle(
      this.playerGraphics.x,
      this.playerGraphics.y,
      radius,
      playerOptions
    );
    World.add(this.physicsEngine.world, this.playerBody);
  }



  // ----- Input -----

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  // ----- Update loop -----

  private update(delta: number) {
    if (!this.playerGraphics || !this.world || !this.mapSprite || !this.playerBody) return;

    // --- INPUT → desired horizontal velocity ---
    let moveX = 0;

    if (this.keys.has("a") || this.keys.has("arrowleft")) moveX -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) moveX += 1;

    if (moveX !== 0) {
      moveX = Math.sign(moveX) * this.moveSpeed;
    }

    const currentVel = this.playerBody.velocity;
    Body.setVelocity(this.playerBody, {
      x: moveX,
      y: currentVel.y,
    });

    // Simple jump test
    if (this.keys.has("w") || this.keys.has("arrowup")) {
      Body.setVelocity(this.playerBody, {
        x: this.playerBody.velocity.x,
        y: -12,
      });
    }

    // Step physics
    if (this.physicsEngine) {
      const dtMs = (delta || 1) * (1000 / 60);
      Engine.update(this.physicsEngine, dtMs);
    }

    // Sync graphics with physics body
    this.playerGraphics.x = this.playerBody.position.x;
    this.playerGraphics.y = this.playerBody.position.y;

    this.updateCamera();
  }

  // ----- Camera & layout -----

  private updateCamera() {
    if (!this.playerGraphics || !this.world || !this.mapSprite) return;

    const app = App.pixi;
    const screenW = app.renderer.width;
    const screenH = app.renderer.height;

    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;

    const targetX = -this.playerGraphics.x + screenW / 2;
    const targetY = -this.playerGraphics.y + screenH / 2;

    const worldMinX = screenW - mapW;
    const worldMaxX = 0;

    const worldMinY = screenH - mapH;
    const worldMaxY = 0;

    this.world.x = Math.min(worldMaxX, Math.max(worldMinX, targetX));
    this.world.y = Math.min(worldMaxY, Math.max(worldMinY, targetY));
  }

  private layout() {
    if (!this.mapSprite || !this.world || !this.playerGraphics) return;
    this.world.scale.set(1);
    this.updateCamera();
  }

  // ----- Cleanup -----

  override destroyScene() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.resizeHandler);
    App.pixi.ticker.remove(this.tickerFn);

    super.destroyScene();
  }
}
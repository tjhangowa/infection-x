import { Container, Sprite, Assets, Ticker, Texture } from "pixi.js";
import { BaseScene } from "./BaseScene";
import { App } from "../core/app";
import { Platform } from "../objects/Platform";
import { Engine, World, Body } from "matter-js";
import { PlayerActor } from "../actors/PlayerActor";
import { Tom } from "../characters/Tom";
import { Jenny } from "../characters/Jenny";
import { Mike } from "../characters/Mike";
import { Infected } from "../characters/Infected";
import { Camera2D } from "../core/camera/Camera2D";
import { Multiplayer } from "../network/multiplayer";
import { sendMove, socket } from "../network/socket";
import { CollisionManager } from "../core/physics/CollisionManager";
import { keys } from "../input/keyboard";
import { PowerUpManager } from "../powerups/PowerUpManager";
import { PowerUpType } from "../powerups/PowerUpTypes";

type PlatformConfigJson = {
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  color: number;
  slope?:{
    rise: number;
    steps: number;
    direction: "left" | "right";
  };
};
export class GameMapScene extends BaseScene {
  private world!: Container;
  private mapSprite!: Sprite;
  private collisionManager!: CollisionManager;
  private lastFacing: "east" | "west" = "east";
  private playerActor!: PlayerActor;
  private platforms: Platform[] = [];
  private platformConfigData: PlatformConfigJson[] = [];
  private platformTexture!:Texture;
  private physicsEngine!: Engine;
  private moveSpeed = 5;
  private powerUpManager!: PowerUpManager;
  private speedPowerUpTexture!: Texture;
  private invisibilityPowerUpTexture!:Texture;
  private myPlayerId: string = "";
  private multiplayer!: Multiplayer;
  private camera!:Camera2D;

  private resizeHandler = () => this.layout();
  private tickerFn = (ticker: Ticker) => this.update(ticker.deltaTime);

  private activeAttack: {
    targetId: string | null;
    timer: number;
    duration: number;
    isAttacking: boolean;
  } = { targetId: null, timer: 0, duration: 0.5, isAttacking: false };

  constructor() {
    super();
  }

  async load() {
    await Promise.all([
      Tom.loadAssets(),
      Jenny.loadAssets(),
      Mike.loadAssets(),
      Infected.loadAssets()
    ]);
    this.myPlayerId = socket.id || "";
    
    // World container that will be moved as the "camera"
    this.world = new Container();
    this.addChild(this.world);

    // Load map background
    const texture = await Assets.load("/assets/Maps/gamemap.jpg");
    this.mapSprite = new Sprite(texture);
    this.mapSprite.anchor.set(0); // top-left
    this.world.addChild(this.mapSprite);

    // Load platform texture and configuration from JSON
    this.platformTexture = await Assets.load("/assets/Platforms/platform_grass.png");
    await this.loadPlatformConfig();

    //Load powerup Texture
    this.speedPowerUpTexture = await Assets.load("/assets/powerups/LightningLayer1.png");
    this.invisibilityPowerUpTexture = await Assets.load("/assets/powerups/InvisibleLayer1.png");

    // Matter.js engine
    this.physicsEngine = Engine.create({
      gravity: { x: 0, y: 1 },
      positionIterations: 8,
      velocityIterations: 6,
      constraintIterations: 4
    });

    this.collisionManager = new CollisionManager(this.physicsEngine);
    // create platforms
    this.createPlatforms();

    // Input + ticker
    window.addEventListener("resize", this.resizeHandler);
    App.pixi.ticker.add(this.tickerFn);

    // Initial camera layout
    this.layout();

    this.multiplayer = new Multiplayer(this.world, (type: string) => {
      this.createPlayer(type);
    });
    
    socket.on("playerInfected", (data: { id: string }) => {
      if (data.id === this.myPlayerId) this.transformLocalPlayer();
    });

    socket.on("playerFrozen", (data: { id: string; duration: number }) => {
      if (data.id === this.myPlayerId && this.playerActor) {
        this.playerActor.freeze(data.duration);
        this.cancelAttack();
      }
    });

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (key === "e") this.startInfectionAttempt();
      if (key === "p") this.tryParry();
    });
  }


  private async loadPlatformConfig() {
    try {
      const res = await fetch("config/demoMapPlatforms.converted.json");
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
      const worldCfg = {
        ...cfg,
        x: cfg.xRatio * mapW,
        y: cfg.yRatio * mapH,
        width: cfg.wRatio * mapW,
        height: cfg.hRatio * mapH,
      };

      if (cfg.slope) {
        const { rise, steps, direction } = cfg.slope;
        const stepWidth = worldCfg.width / steps;
        const stepHeight = rise / steps;
        const dir = direction === "right" ? 1 : -1;

        for (let i = 0; i < steps; i++) {
          const stepX =
            worldCfg.x + dir * (-worldCfg.width / 2 + stepWidth / 2 + i * stepWidth);
          const stepY = worldCfg.y - stepHeight * (i + 1);

          const step = new Platform({
            x: stepX,
            y: stepY,
            width: stepWidth,
            height: worldCfg.height,
            color: worldCfg.color,
          },this.platformTexture);

          this.platforms.push(step);
          this.world.addChild(step);

          World.add(this.physicsEngine.world, step.body);
          this.collisionManager.registerObject(step);
        }
        continue;
      }

      const p = new Platform({
        x: worldCfg.x,
        y: worldCfg.y,
        width: worldCfg.width,
        height: worldCfg.height,
        color: worldCfg.color,
      },this.platformTexture);

      this.platforms.push(p);
      this.world.addChild(p);

      World.add(this.physicsEngine.world, p.body);
      this.collisionManager.registerObject(p);
    }
  }

  private createPlayer(type: string) {
    let newSprite;
    if (type === "infected") newSprite = new Infected();
    else if (type === "tom") newSprite = new Tom();
    else if (type === "jenny") newSprite = new Jenny();
    else newSprite = new Mike();

    // Swap sprite if actor exists
    if (this.playerActor) {
      this.world.removeChild(this.playerActor.sprite);
      this.world.addChild(newSprite);

      this.playerActor.sprite = newSprite;

      Body.setVelocity(this.playerActor.body, { x: 0, y: 0 });
      Body.setAngularVelocity(this.playerActor.body, 0);
      this.playerActor.syncFromPhysics();

      // powerups manager already exists; keep it
      return;
    }

    // first-time spawn
    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;
    const x = mapW / 2;
    const y = mapH / 2;

    this.world.addChild(newSprite);
    this.playerActor = new PlayerActor(newSprite, x, y);

    World.add(this.physicsEngine.world, this.playerActor.body);
    this.collisionManager.registerObject(this.playerActor);

    this.camera = new Camera2D(this.world, this.playerActor.body.position);

    // INIT POWERUPS ONCE WE HAVE A PLAYER
    this.initPowerUps();
  }

  private initPowerUps() {
    if (this.powerUpManager) return;

    this.powerUpManager = new PowerUpManager(
      this.physicsEngine,
      this.world,
      this.playerActor,
    );

    this.powerUpManager.configure({
      texturesByType: {
        [PowerUpType.Speed]: this.speedPowerUpTexture,
        [PowerUpType.Invisibility]: this.invisibilityPowerUpTexture,
      },
      speedHooks: {
        getSpeed: () => this.moveSpeed,
        setSpeed: (value: number) => (this.moveSpeed = value),
      },
      invisibilityHooks: {
        getCharacterType: () => {
          const s = this.playerActor?.sprite;
          if (!s) return "tom";
          if (s instanceof Infected) return "infected";
          if (s instanceof Jenny) return "jenny";
          if (s instanceof Mike) return "mike";
          return "tom";
        },
        setCharacterType: (type) => {
          // purely visual swap; do not touch the physics body
          this.swapLocalVisual(type);
        },
        getHumanDisguiseType: () => {
          const humans: Array<"tom" | "jenny" | "mike"> = ["tom", "jenny", "mike"];
          return humans[Math.floor(Math.random() * humans.length)];
        },
      },
      scaleByType: {
        [PowerUpType.Speed]: 0.6,
        [PowerUpType.Invisibility]: 0.6,
      },
    });

    // Use same socket object as the rest of networking
    this.powerUpManager.enableNetworking(socket);

    // Optional local test spawn (remove when server emits powerupSpawned)
    this.powerUpManager.spawnFromPayload({
      id: "speedPU-1",
      type: PowerUpType.Speed,
      x: this.playerActor.body.position.x + 300,
      y: this.playerActor.body.position.y + 200,
      durationMs: 5000,
      multiplier: 1.7,
    });

    this.powerUpManager.spawnFromPayload({
      id: "invPU-1",
      type: PowerUpType.Invisibility,
      x: this.playerActor.body.position.x + 360,
      y: this.playerActor.body.position.y + 200,
      durationMs: 4000,
    });
  }
  private swapLocalVisual(type: "tom" | "jenny" | "mike" | "infected") {
    if (!this.playerActor) return;

    let newSprite;
    if (type === "infected") newSprite = new Infected();
    else if (type === "tom") newSprite = new Tom();
    else if (type === "jenny") newSprite = new Jenny();
    else newSprite = new Mike();

    // Swap just the display object
    this.world.removeChild(this.playerActor.sprite);
    this.world.addChild(newSprite);

    this.playerActor.sprite = newSprite;

    // Force immediate sync so the new sprite snaps to the physics body
    this.playerActor.syncFromPhysics();
  }

  private update(delta: number) {
    if (!this.playerActor || !this.world || !this.mapSprite) return;

    // freeze logic
    if (this.playerActor.isFrozen) {
      Body.setVelocity(this.playerActor.body, {
        x: 0,
        y: this.playerActor.body.velocity.y,
      });

      this.playerActor.syncFromPhysics();
      this.camera.update(
        App.pixi.renderer.width,
        App.pixi.renderer.height,
        this.mapSprite.texture.width,
        this.mapSprite.texture.height,
      );
      return;
    }

    // infection timer logic 
    if (this.activeAttack.isAttacking) {
      const dt = App.pixi.ticker.deltaMS / 1000;
      this.activeAttack.timer += dt;

      const progress = this.activeAttack.timer / this.activeAttack.duration;
      this.playerActor.infectionIndicator.updateProgress(progress);

      if (this.activeAttack.timer >= this.activeAttack.duration) {
        if (this.activeAttack.targetId) socket.emit("infectPlayer", this.activeAttack.targetId);
        this.cancelAttack();
      }
    }

    const isInfected = this.playerActor.sprite instanceof Infected;
    const currentSpeed = isInfected ? this.moveSpeed * 0.75 : this.moveSpeed;

    const body = this.playerActor.body;
    const sprite = this.playerActor.sprite;

    let moveX = 0;
    if (keys["a"] || keys["arrowleft"]) moveX -= 1;
    if (keys["d"] || keys["arrowright"]) moveX += 1;

    if (moveX !== 0) moveX = Math.sign(moveX) * currentSpeed;

    const vx = body.velocity.x;
    const speedThreshold = 0.2;

    let anim: string | null = null;
    if (Math.abs(vx) > speedThreshold) {
      if (vx > 0) { anim = "run_east"; this.lastFacing = "east"; }
      else { anim = "run_west"; this.lastFacing = "west"; }
    } else {
      anim = this.lastFacing === "east" ? "idle_east" : "idle_west";
    }

    if (anim) sprite.playAnimation(anim);

    Body.setVelocity(body, { x: moveX, y: body.velocity.y });

    if ((keys[" "] || keys["arrowup"]) && this.playerActor.isGrounded) {
      Body.setVelocity(body, { x: body.velocity.x, y: -10 });
    }

    const dtMs = (delta || 1) * (1000 / 60);
    Engine.update(this.physicsEngine, dtMs);

    this.playerActor.syncFromPhysics();

    // powerups update
    this.powerUpManager?.update(dtMs, performance.now());

    // send movement
    sendMove(
      body.position.x,
      body.position.y,
      body.velocity.x,
      body.velocity.y,
      anim ?? "",
    );

    this.camera.update(
      App.pixi.renderer.width,
      App.pixi.renderer.height,
      this.mapSprite.texture.width,
      this.mapSprite.texture.height,
    );
  }

  private layout() {
    if (!this.mapSprite || !this.world) return;

    const screenW = App.pixi.renderer.width;
    const screenH = App.pixi.renderer.height;

    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;

    const scale = Math.min(screenW / mapW, screenH / mapH);
    this.world.scale.set(scale);
    this.world.x = (screenW - mapW * scale) / 2;
    this.world.y = (screenH - mapH * scale) / 2;
  }

  private cancelAttack() {
    this.activeAttack.isAttacking = false;
    this.activeAttack.targetId = null;
    this.activeAttack.timer = 0;
    this.playerActor.infectionIndicator.hide();
  }

  private startInfectionAttempt() {
    if (!(this.playerActor.sprite instanceof Infected)) return;
    if (this.playerActor.isFrozen) return;
    if (this.activeAttack.isAttacking) return;

    const range = 60;
    let closestId: string | null = null;
    let minDist = Infinity;

    // NOTE: this assumes multiplayer exposes otherPlayers. If it’s private in your Multiplayer,
    // you’ll need a getter (recommended) or make it public.
    for (const [id, remoteChar] of Object.entries((this.multiplayer as any).otherPlayers)) {
      if (remoteChar instanceof Infected) continue;

      const dx = this.playerActor.body.position.x - remoteChar.x;
      const dy = this.playerActor.body.position.y - remoteChar.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range && dist < minDist) {
        minDist = dist;
        closestId = id;
      }
    }

    if (closestId) {
      this.activeAttack.isAttacking = true;
      this.activeAttack.targetId = closestId;
      this.activeAttack.timer = 0;
      this.playerActor.infectionIndicator.show();
    }
  }

  private tryParry() {
    if (this.playerActor.sprite instanceof Infected) return;
    if (!this.playerActor.canParry()) return;

    const parryRange = 80;
    let parriedZombieId: string | null = null;

    for (const [id, remoteChar] of Object.entries((this.multiplayer as any).otherPlayers)) {
      const dx = this.playerActor.body.position.x - remoteChar.x;
      const dy = this.playerActor.body.position.y - remoteChar.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < parryRange && remoteChar instanceof Infected) {
        parriedZombieId = id;
        break;
      }
    }

    if (parriedZombieId) {
      socket.emit("parryZombie", parriedZombieId);
      this.playerActor.parryCooldownEnd = Date.now() + 30000;
    }
  }

  private transformLocalPlayer() {
    this.world.removeChild(this.playerActor.sprite);
    const infectedSprite = new Infected();
    this.world.addChild(infectedSprite);
    this.playerActor.sprite = infectedSprite;
  }

  override destroyScene() {
    this.powerUpManager = undefined as any;
    window.removeEventListener("resize", this.resizeHandler);
    App.pixi.ticker.remove(this.tickerFn);
    socket.off("playerInfected");
    socket.off("youGotParried");
    if (this.multiplayer) {
      this.multiplayer.destroy();
    }
    super.destroyScene();
  }
}
import { Container, Sprite, Assets, Ticker } from "pixi.js";
import { BaseScene } from "./BaseScene";
import { App } from "../core/app";
import { Platform } from "../objects/Platform";
import { Engine, World, Body } from "matter-js";
import { PlayerActor } from "../actors/PlayerActor";
import { Tom } from "../characters/Tom";
import { Jenny } from "../characters/Jenny";
import { Mike } from "../characters/Mike";
import { CollisionManager } from "../core/physics/CollisionManager";
import { keys } from "../input/keyboard";
import { Camera2D } from "../core/camera/Camera2D";
import { Multiplayer } from "../network/multiplayer";
import { sendMove, socket } from "../network/socket";
import { Infected } from "../characters/Infected";
import { GameHUD } from "../ui/GameHud";
import { isActionDown, isActionKey } from "../ui/Keybinds";
type PlatformConfigJson = {
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  color: number;
  slope?: {
    rise: number;
    steps: number;
    direction: "left" | "right";
  };
};
export class GameMapScene extends BaseScene {
  private world!: Container;
  private uiLayer!: Container;
  private hud!: GameHUD;
  private mapSprite!: Sprite;
  private collisionManager!: CollisionManager;
  private lastFacing: "east" | "west" = "east";
  private playerActor!: PlayerActor;
  private platforms: Platform[] = [];
  private platformConfigData: PlatformConfigJson[] = [];
  private physicsEngine!: Engine;
  private camera!: Camera2D;
  private readonly moveSpeed = 5;
  private myPlayerId: string = "";
  private multiplayer!: Multiplayer;
  private resizeHandler = () => this.layout();
  private tickerFn = (ticker: Ticker) => this.update(ticker.deltaTime);

  // ✅ NEW: Combat Logic State
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
      Infected.loadAssets(),
    ]);
    this.myPlayerId = socket.id || "";
    // World container that will be moved as the "camera"
    this.world = new Container();
    this.addChild(this.world);

    this.uiLayer = new Container();
    this.addChild(this.uiLayer);

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
      positionIterations: 8,
      velocityIterations: 6,
      constraintIterations: 4,
    });

    this.collisionManager = new CollisionManager(this.physicsEngine);
    // create platforms
    this.createPlatforms();

    // Input + ticker
    window.addEventListener("resize", this.resizeHandler);
    App.pixi.ticker.add(this.tickerFn);

    this.hud = new GameHUD();
    this.uiLayer.addChild(this.hud);

    // Initial camera layout
    this.layout();
    // ✅ PASS A CALLBACK TO MULTIPLAYER
    // We wait for the server to tell us who we are, then we spawn.
    this.multiplayer = new Multiplayer(this.world, (type) => {
      this.createPlayer(type);
    });

    socket.on("matchUpdate", (data: { time: number, alive: number, total: number }) => {
        this.hud.updateStats(data.time, data.alive, data.total);
    });

    // 1. Listen for when I get infected
    socket.on("playerInfected", (data: { id: string }) => {
      if (data.id === this.myPlayerId) {
        this.transformLocalPlayer();
      }
    });
    //  Handle Global Freeze Event
    socket.on("playerFrozen", (data: { id: string; duration: number }) => {
      // 1. If *I* am the one being frozen:
      if (data.id === this.myPlayerId) {
        console.log("I have been stunned!");
        this.playerActor.freeze(data.duration);
        this.cancelAttack();
      }
      // Note: Remote players are handled in Multiplayer.ts, see below
    });

    socket.on("playerDied", (data: { id: string }) => {
        // 1. If it's ME
        if (data.id === this.myPlayerId) {
            console.log("I died!");
            // Optional: Show "Spectating" text or respawn logic
            // For now, we just remove our sprite so we disappear
            if (this.playerActor) {
                this.world.removeChild(this.playerActor.sprite);
            }
        } 
        // 2. If it's SOMEONE ELSE (Remote)
        else {
             if (this.multiplayer.otherPlayers[data.id]) {
                 this.world.removeChild(this.multiplayer.otherPlayers[data.id]);
                 delete this.multiplayer.otherPlayers[data.id];
             }
        }
    });

    // 2. Updated Input Listeners
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (isActionKey("infect", key)) this.startInfectionAttempt();
      if (isActionKey("parry", key)) this.tryParry();
    });

    console.log("using gamemapscene");
  }

  // ----- Setup helpers -----

  private async loadPlatformConfig() {
    try {
      const res = await fetch("assets/config/demoMapPlatforms.converted.json");
      if (!res.ok) {
        console.error(
          "Failed to load platform config JSON",
          res.status,
          res.statusText,
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
      // Convert ratios → world space
      const worldCfg = {
        ...cfg,
        x: cfg.xRatio * mapW,
        y: cfg.yRatio * mapH,
        width: cfg.wRatio * mapW,
        height: cfg.hRatio * mapH,
      };

      // ---- SLOPED PLATFORM (STEPS) ----
      if (cfg.slope) {
        const { rise, steps, direction } = cfg.slope;

        const stepWidth = worldCfg.width / steps;
        const stepHeight = rise / steps;
        const dir = direction === "right" ? 1 : -1;

        for (let i = 0; i < steps; i++) {
          const stepX =
            worldCfg.x +
            dir * (-worldCfg.width / 2 + stepWidth / 2 + i * stepWidth);

          const stepY = worldCfg.y - stepHeight * (i + 1);

          const step = new Platform({
            x: stepX,
            y: stepY,
            width: stepWidth,
            height: worldCfg.height,
            color: worldCfg.color,
          });

          this.platforms.push(step);
          this.world.addChild(step);

          World.add(this.physicsEngine.world, step.body);
          this.collisionManager.registerObject(step);
        }
        continue; // IMPORTANT: skip normal platform creation
      }

      // ---- NORMAL FLAT PLATFORM ----
      const p = new Platform({
        x: worldCfg.x,
        y: worldCfg.y,
        width: worldCfg.width,
        height: worldCfg.height,
        color: worldCfg.color,
      });

      this.platforms.push(p);
      this.world.addChild(p);

      World.add(this.physicsEngine.world, p.body);
      this.collisionManager.registerObject(p);
    }
  }

  //-------Creating Player------------
  private createPlayer(type: string) {
    let newSprite;

    // 1. Select the correct class based on Server Data
    if (type === "infected") newSprite = new Infected();
    else if (type === "tom") newSprite = new Tom();
    else if (type === "jenny") newSprite = new Jenny();
    else newSprite = new Mike();

    // ✅ CASE A: Player already exists? JUST SWAP THE SPRITE.
    if (this.playerActor) {
      console.log(`Swapping existing player sprite to ${type}`);

      // 1. Remove old sprite from screen
      this.world.removeChild(this.playerActor.sprite);

      // 2. Add new sprite to screen
      this.world.addChild(newSprite);

      // 3. Update the Actor to use the new sprite
      // (We DO NOT touch the physics body or collision manager!)
      this.playerActor.sprite = newSprite;

      //  CRITICAL FIX: Reset momentum when swapping
      Body.setVelocity(this.playerActor.body, { x: 0, y: 0 });
      Body.setAngularVelocity(this.playerActor.body, 0);
      // 4. Force a sync so the new sprite jumps to the body's position immediately
      this.playerActor.syncFromPhysics();
      return;
    }

    // ✅ CASE B: No player yet? Create from scratch (Initial Load)
    console.log(`Creating NEW player as ${type}`);

    // Use map center
    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;
    const x = mapW / 2;
    const y = mapH / 2;

    this.world.addChild(newSprite);
    this.playerActor = new PlayerActor(newSprite, x, y);

    World.add(this.physicsEngine.world, this.playerActor.body);
    this.collisionManager.registerObject(this.playerActor);

    this.camera = new Camera2D(this.world, this.playerActor.body.position);
    //this.camera.disable();
  }
  // ----- Update loop -----

  private update(delta: number) {
    if (!this.playerActor || !this.world || !this.mapSprite) return;
    // ✅ 1. FREEZE CHECK
    if (this.playerActor.isFrozen) {
      // Stop movement immediately
      Body.setVelocity(this.playerActor.body, {
        x: 0,
        y: this.playerActor.body.velocity.y,
      });

      // Render camera/sync but SKIP INPUT processing below
      this.playerActor.syncFromPhysics();
      this.camera.update(
        App.pixi.renderer.width,
        App.pixi.renderer.height,
        this.mapSprite.texture.width,
        this.mapSprite.texture.height,
      );
      return;
    }

    // ✅ 2. INFECTION TIMER LOGIC
    if (this.activeAttack.isAttacking) {
      // Use raw seconds for timer
      const dt = App.pixi.ticker.deltaMS / 1000;
      this.activeAttack.timer += dt;

      // Update Visual
      const progress = this.activeAttack.timer / this.activeAttack.duration;
      this.playerActor.infectionIndicator.updateProgress(progress);

      // Check Completion
      if (this.activeAttack.timer >= this.activeAttack.duration) {
        if (this.activeAttack.targetId) {
          socket.emit("infectPlayer", this.activeAttack.targetId);
        }
        this.cancelAttack();
      }
    }

    const isInfected = this.playerActor.sprite instanceof Infected;
    const currentSpeed = isInfected ? this.moveSpeed * 0.75 : this.moveSpeed; // 25% slower if infected
    const body = this.playerActor.body;
    const sprite = this.playerActor.sprite;

    let moveX = 0;
    if (isActionDown("moveLeft")) moveX -= 1;
    if (isActionDown("moveRight")) moveX += 1;

    if (moveX !== 0) moveX = Math.sign(moveX) * currentSpeed;

    // ---- Animation Decision ----
    const vx = body.velocity.x;
    const speedThreshold = 0.2;

    let anim: string | null = null;

    if (Math.abs(vx) > speedThreshold) {
      // 1. Moving
      if (vx > 0) {
        anim = "run_east";
        this.lastFacing = "east";
      } else {
        anim = "run_west";
        this.lastFacing = "west";
      }
    } else {
      // 2. Not Moving (Idle OR Falling)
      // Even if we are falling, we should default to idle facing direction
      // (or a jump animation if you have one) so we don't get stuck in "run"
      anim = this.lastFacing === "east" ? "idle_east" : "idle_west";
    }

    if (anim) sprite.playAnimation(anim);

    // ---- physics ----
    Body.setVelocity(body, {
      x: moveX,
      y: body.velocity.y,
    });
    //this.playerActor.isGrounded)
    if (isActionDown("jump") && this.playerActor.isGrounded) {
    Body.setVelocity(body, { x: body.velocity.x, y: -10 });
}
    // 👇 DEBUG: Check physics state
    if (keys["t"])
      console.log(
        `Grounded: ${this.playerActor.isGrounded} | VY: ${body.velocity.y.toFixed(2)}`,
      );
    Engine.update(this.physicsEngine, (delta || 1) * (1000 / 60));

    // sync sprite
    this.playerActor.syncFromPhysics();
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

  // ----- Camera & layout -----
  // private updateCamera() {
  // if (!this.player || !this.world || !this.mapSprite || !this.playerBody)
  // return;

  // const app = App.pixi;
  // const screenW = app.renderer.width;
  // const screenH = app.renderer.height;

  // const mapW = this.mapSprite.texture.width;
  // const mapH = this.mapSprite.texture.height;

  //const targetX = -this.playerActor.sprite.x + screenW / 2;
  //const targetY = -this.playerActor.sprite.y + screenH / 2;

  // const worldMinX = screenW - mapW;
  // const worldMaxX = 0;

  // const worldMinY = screenH - mapH;
  // const worldMaxY = 0;

  // this.world.x = Math.min(worldMaxX, Math.max(worldMinX, targetX));
  // this.world.y = Math.min(worldMaxY, Math.max(worldMinY, targetY));
  // }

  private layout() {
    if (!this.mapSprite || !this.world) return;

    const app = App.pixi;

    const screenW = app.renderer.width;
    const screenH = app.renderer.height;

    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;

    // 👉 SCALE MAP TO FIT ENTIRE SCREEN (CONTAIN)
    const scale = Math.min(screenW / mapW, screenH / mapH);

    this.world.scale.set(scale);

    // 👉 CENTER THE MAP
    this.world.x = (screenW - mapW * scale) / 2;
    this.world.y = (screenH - mapH * scale) / 2;
  }
  // ✅ NEW: Helper to Cancel Attack
  private cancelAttack() {
    this.activeAttack.isAttacking = false;
    this.activeAttack.targetId = null;
    this.activeAttack.timer = 0;
    this.playerActor.infectionIndicator.hide();
  }

  // -----------------------------
  // ✅ RENAMED & UPDATED: Start Infection (was tryInfect)
  private startInfectionAttempt() {
    if (!(this.playerActor.sprite instanceof Infected)) return; // Only zombies
    if (this.playerActor.isFrozen) return;
    if (this.activeAttack.isAttacking) return; // Prevent spam

    const range = 60;
    let closestId: string | null = null;
    let minDist = Infinity;

    for (const [id, remoteChar] of Object.entries(
      this.multiplayer.otherPlayers,
    )) {
      if (remoteChar instanceof Infected) continue; // Ignore other zombies

      const dx = this.playerActor.body.position.x - remoteChar.x;
      const dy = this.playerActor.body.position.y - remoteChar.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range && dist < minDist) {
        minDist = dist;
        closestId = id;
      }

      this.hud.x = 10;
      this.hud.y = 10;
    }

    if (closestId) {
      // Start the Clock!
      this.activeAttack.isAttacking = true;
      this.activeAttack.targetId = closestId;
      this.activeAttack.timer = 0;
      this.playerActor.infectionIndicator.show();
    }
  }
  // ✅ NEW: Parry Logic
  private tryParry() {
    // Must be Healthy
    if (this.playerActor.sprite instanceof Infected) return;

    // Check Cooldown
    if (!this.playerActor.canParry()) {
      console.log("Parry on cooldown!");
      return;
    }

    const parryRange = 80;
    let parriedZombieId: string | null = null;

    for (const [id, remoteChar] of Object.entries(
      this.multiplayer.otherPlayers,
    )) {
      const dx = this.playerActor.body.position.x - remoteChar.x;
      const dy = this.playerActor.body.position.y - remoteChar.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If zombie is close, we parry them (Logic assumption: they are attacking)
      if (dist < parryRange && remoteChar instanceof Infected) {
        parriedZombieId = id;
        break;
      }
    }

    if (parriedZombieId) {
      console.log("SUCCESSFUL PARRY!");
      socket.emit("parryZombie", parriedZombieId);
      this.playerActor.parryCooldownEnd = Date.now() + 30000; // 30s Cooldown
    }
  }

  private transformLocalPlayer() {
    // 1. Remove old sprite
    this.world.removeChild(this.playerActor.sprite);

    // 2. Create new Infected sprite
    const infectedSprite = new Infected();
    this.world.addChild(infectedSprite);

    // 3. Link Actor to new sprite (Physics body stays the same!)
    this.playerActor.sprite = infectedSprite;

    console.log("I have been infected!");
  }

  // ----- Cleanup -----

  // ✅ UPDATED CLEANUP (Destroys Multiplayer to stop leaks)
  override destroyScene() {
    window.removeEventListener("resize", this.resizeHandler);
    App.pixi.ticker.remove(this.tickerFn);
    socket.off("playerInfected");
    socket.off("youGotParried");
    // 🛡️ CRITICAL FIX: Destroy multiplayer to remove socket listeners
    if (this.multiplayer) {
      this.multiplayer.destroy();
    }
    super.destroyScene();
  }
}

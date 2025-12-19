import { Container, Sprite, Assets, Ticker, Text, TextStyle } from "pixi.js";
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
import {
  sendMove,
  socket,
  setPowerUpListeners,
  sendPowerUpCollected,
} from "../network/socket";
import { Infected } from "../characters/Infected";
import { ParryUI } from "../ui/ParryUI";
import { GameHUD } from "../ui/GameHUD";
import { PowerUpManager } from "../core/PowerUpManager";
import { SpeedPowerUp } from "../powerups/implementations/SpeedPowerUp";
import { InvisibilityPowerUp } from "../powerups/implementations/InvisibilityPowerUp";
import { BaseCharacter } from "../characters/BaseCharacter";
import { CountdownUI } from "../ui/CountdownUI";

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
  private mapSprite!: Sprite;
  private collisionManager!: CollisionManager;
  private lastFacing: "east" | "west" = "east";
  private playerActor!: PlayerActor;
  private platforms: Platform[] = [];
  private platformConfigData: PlatformConfigJson[] = [];
  private physicsEngine!: Engine;
  private camera!: Camera2D;
  private myPlayerId: string = "";
  private multiplayer!: Multiplayer;
  private resizeHandler = () => this.layout();
  private wasEPressed = false;
  private wasPPressed = false;
  private powerUpManager!: PowerUpManager;

  // ✅ FIX 1: Use deltaMS accumulator for stable physics time
  private tickerFn = () => this.update();
  private physicsAccumulator = 0;
  private readonly FIXED_TIMESTEP = 1000 / 60; // 16.66ms per step

  private parryUI!: ParryUI;
  private wasJumpKeyPressed = false;
  private gameHUD!: GameHUD;
  private isSpectating = false;
  private invisibleRemotePlayers: Map<string, number> = new Map();
  private countdownUI!: CountdownUI;

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
      SpeedPowerUp.loadAssets(),
      InvisibilityPowerUp.loadAssets(),
    ]);
    this.myPlayerId = socket.id || "";
    setPowerUpListeners(
      // 1. On Spawn (Server says create)
      (data) => {
        // The server sends us the ID, we pass it to the spawn function
        this.spawnPowerUp(data.type, data.x, data.y, data.id);
      },
      // 2. On Remove (Server says delete)
      (id) => {
        if (this.powerUpManager) {
          this.powerUpManager.remove(id);
        }
      },
    );
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

    //Load parryui
    this.parryUI = new ParryUI();
    this.addChild(this.parryUI);

    //Load GameHUD
    this.gameHUD = new GameHUD();
    this.addChild(this.gameHUD);

    //Load Matter.js engine
    this.physicsEngine = Engine.create({
      gravity: { x: 0, y: 1 },
      positionIterations: 12,
      velocityIterations: 8,
      constraintIterations: 4,
    });
    //Load CountdownUI
    this.countdownUI = new CountdownUI();
    this.addChild(this.countdownUI);

    this.collisionManager = new CollisionManager(this.physicsEngine);
    // create platforms
    this.createPlatforms();

    // Input + ticker
    window.addEventListener("resize", this.resizeHandler);
    App.pixi.ticker.add(this.tickerFn);

    // Initial camera layout
    this.layout();
    // ✅ PASS A CALLBACK TO MULTIPLAYER
    // We wait for the server to tell us who we are, then we spawn.
    this.multiplayer = new Multiplayer(
      this.world,
      (type: string, x: number, y: number) => {
        this.createPlayer(type, x, y);
      },
    );

    socket.on("matchStartTimer", (data: { delay: number }) => {
      console.log("Timer delay received:", data.delay);
      this.countdownUI.startTimer(data.delay);
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
      //If SOMEONE ELSE was frozen, maybe I parried them? (Show Green Text)
      // We check if the frozen player is close to us.
      const remote = this.multiplayer.otherPlayers[data.id];
      if (remote) {
        const dist = Math.abs(this.playerActor.sprite.x - remote.x);

        // If they are close (within 150px), assume I caused the parry
        if (dist < 150) {
          this.showFloatingText(
            "PARRIED!",
            this.playerActor.sprite.x,
            this.playerActor.sprite.y,
            0x00ff00,
          ); // Green
        }
      }
    });

    // ✅ 2. Handle Failed Parry (Server says they weren't attacking)
    socket.on("parryFailed", () => {
      this.showFloatingText(
        "Missed!",
        this.playerActor.sprite.x,
        this.playerActor.sprite.y,
        0xff0000,
      ); // Red
    });
    // ✅ NEW EVENT LISTENERS
    // ----------------------------

    // 1. HUD Update
    socket.on(
      "matchUpdate",
      (data: { time: number; alive: number; total: number }) => {
        this.gameHUD.updateStats(data.time, data.alive, data.total);
      },
    );

    // 2. Player Died (Spectator Mode)
    socket.on("playerDied", (data: { id: string }) => {
      // If I died
      if (data.id === this.myPlayerId) {
        console.log("I died. Switching to Spectator.");
        this.isSpectating = true;
        this.gameHUD.showSpectating();

        // Disable Physics/Controls
        this.world.removeChild(this.playerActor.sprite);
        // Optional: Move body far away or destroy it

        // Switch Camera
        this.camera.disable();
        this.layout(); // Force full map view
      }
      // If someone else died
      else {
        if (this.multiplayer.otherPlayers[data.id]) {
          this.world.removeChild(this.multiplayer.otherPlayers[data.id]);
          delete this.multiplayer.otherPlayers[data.id];
        }
      }
    });

    // 3. Game Over
    socket.on(
      "gameOver",
      (data: { mainText: string; subText: string; color: string }) => {
        this.gameHUD.showGameOver(data.mainText, data.subText, data.color);
      },
    );

    // 4. Lobby Timer
    socket.on("lobbyTimer", (data: { time: number }) => {
      this.gameHUD.updateLobbyTimer(data.time);
    });

    // ✅ NEW: Handle PowerUp Active Effects (Visuals)
    socket.on(
      "playerPowerUpActive",
      (data: { id: string; type: "speed" | "invis"; duration: number }) => {
        this.handlePowerUpVisuals(data.id, data.type, data.duration);
      },
    );
    // 5. Return to Main Menu
    socket.on("returnToLobby", () => {
      console.log("Returning to Menu...");
      window.location.reload();
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
            width: stepWidth + 2,
            height: worldCfg.height,
            color: worldCfg.color,
          });
          // ✅ FIX 2: Remove friction from the steps
          // This ensures the player doesn't "grip" the vertical wall of the next step
          step.body.friction = 0;
          step.body.frictionStatic = 0;
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
  private createPlayer(type: string, serverX?: number, serverY?: number) {
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

    // Use Server X/Y if provided, otherwise fallback to center
    const mapW = this.mapSprite.texture.width;
    const mapH = this.mapSprite.texture.height;

    // ✅ USE SERVER COORDINATES
    const x = serverX ?? mapW / 2;
    const y = serverY ?? mapH / 2;

    this.world.addChild(newSprite);
    this.playerActor = new PlayerActor(newSprite, x, y);

    World.add(this.physicsEngine.world, this.playerActor.body);
    this.collisionManager.registerObject(this.playerActor);
    this.powerUpManager = new PowerUpManager(
      this.physicsEngine,
      this.world,
      this.playerActor,
    );
    this.camera = new Camera2D(this.world, this.playerActor.body.position);
    //this.camera.disable();
    this.layout();
    console.log("DEBUG: Attempting to spawn PowerUp..."); // Log 1
    // this.spawnPowerUp("invis", x + 100, y - 100);
  }
  // ----- Update loop -----

  private update() {
    if (
      !this.playerActor ||
      !this.world ||
      !this.mapSprite ||
      this.isSpectating
    )
      return;

    // ✅ 3. Update the UI Logic
    if (this.countdownUI) {
      this.countdownUI.update();
    }

    // ✅ 4. Check if we should block input/physics
    // If the match is NOT active, we freeze the player and stop here.
    if (this.countdownUI && !this.countdownUI.isMatchActive) {
      // Stop momentum so they don't slide while waiting
      if (this.playerActor) {
        Body.setVelocity(this.playerActor.body, { x: 0, y: 0 });
        this.playerActor.syncFromPhysics();
      }
      // Keep camera updated so we can look around (optional) or just freeze frame
      this.camera.update(
        App.pixi.renderer.width,
        App.pixi.renderer.height,
        this.mapSprite.texture.width,
        this.mapSprite.texture.height,
      );
      return; // STOP:Do not process inputs or physics below
    }

    if (this.powerUpManager) {
      // Pass deltaMS (elapsed time) and Date.now()
      this.powerUpManager.update(App.pixi.ticker.deltaMS, Date.now());
      // ✅ Update HUD Timer
      if (this.gameHUD) this.gameHUD.update(App.pixi.ticker.deltaMS);
    }
    // ✅ NEW: Update Parry UI
    if (this.playerActor.sprite instanceof Infected) {
      // Infected players don't need this UI
      this.parryUI.visible = false;
    } else {
      // Healthy players see it
      this.parryUI.visible = true;
      this.parryUI.updateState(this.playerActor.parryCooldownEnd);
    }
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
    // 1. Handle "E" for Infection
    // Logic: Key is down NOW, but was UP last frame == "Just Pressed"
    if (keys["e"]) {
      if (!this.wasEPressed) {
        this.startInfectionAttempt();
      }
      this.wasEPressed = true; // Mark as held for next frame
    } else {
      this.wasEPressed = false; // Reset when key is released
    }

    // 2. Handle "P" for Parry
    if (keys["p"]) {
      if (!this.wasPPressed) {
        this.tryParry();
      }
      this.wasPPressed = true;
    } else {
      this.wasPPressed = false;
    }
    const baseSpeed = this.playerActor.moveSpeed;
    const isInfected = this.playerActor.sprite instanceof Infected;
    const currentSpeed = isInfected ? baseSpeed * 0.75 : baseSpeed; // 25% slower if infected
    const body = this.playerActor.body;
    const sprite = this.playerActor.sprite;
    //movement logic (left/right)
    let moveX = 0;
    if (keys["a"] || keys["arrowleft"]) moveX -= 1;
    if (keys["d"] || keys["arrowright"]) moveX += 1;

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

    // ---- PHYSICS ----
    // Prevent player from falling so fast they tunnel through floors
    const MAX_FALL_SPEED = 30;
    if (body.velocity.y > MAX_FALL_SPEED) {
      Body.setVelocity(body, {
        x: body.velocity.x,
        y: MAX_FALL_SPEED,
      });
    }
    Body.setVelocity(body, {
      x: moveX,
      y: body.velocity.y,
    });

    //STEP ASSIST (The "Stair Climber")
    // If we are pushing Left/Right, Grounded, but barely moving horizontally...
    // We are likely stuck on a small step. Lift the player up to help them climb.
    if (
      moveX !== 0 &&
      this.playerActor.isGrounded &&
      Math.abs(body.velocity.x) < 0.5 //threshhold is 0.5
    ) {
      // Nudge the player upwards by 6 pixels (adjust based on your step height)
      // This clears the "vertical lip" of the step so the chamfer can slide over.
      Body.setPosition(body, {
        x: body.position.x + Math.sign(moveX) * 2,
        y: body.position.y - 6,
      });
    }
    // ✅ NEW DOUBLE JUMP LOGIC STARTS HERE
    // =========================================================
    // 1. Reset Jumps if Grounded
    // (We do this every frame so we regain jumps the moment we touch ground)
    if (this.playerActor.isGrounded) {
      // Infected get 1 jump (Normal), Healthy get 2 (Double Jump)
      const isInfected = this.playerActor.sprite instanceof Infected;
      this.playerActor.jumpsRemaining = isInfected ? 1 : 2;
    }

    // 2. Check Input (Debounced: Only trigger on "Just Pressed")
    const isJumpPressed = keys[" "] || keys["arrowup"];

    if (isJumpPressed && !this.wasJumpKeyPressed) {
      // Only jump if we have jumps left
      if (this.playerActor.jumpsRemaining > 0) {
        this.playerActor.jumpsRemaining--;

        // Force Grounded false so we don't accidentally reset jumps next frame
        this.playerActor.isGrounded = false;

        // Different Jump Heights
        const isInfected = this.playerActor.sprite instanceof Infected;
        const jumpForce = isInfected ? -13 : -10; // Infected jumps higher

        Body.setVelocity(body, {
          x: body.velocity.x,
          y: jumpForce,
        });
      }
    }

    // Update "Was Pressed" for next frame so holding space doesn't spam jumps
    this.wasJumpKeyPressed = isJumpPressed;
    // =========================================================
    // ✅ END NEW LOGIC
    // 👇 DEBUG: Check physics state
    if (keys["t"])
      console.log(
        `Grounded: ${this.playerActor.isGrounded} | VY: ${body.velocity.y.toFixed(2)}`,
      );
    // ✅ FIX 3: PHYSICS ACCUMULATOR
    // This loop ensures physics runs at exactly 60 updates per second of GAME TIME
    // regardless of your monitor's 144Hz or 60Hz refresh rate.
    const frameDt = App.pixi.ticker.deltaMS;
    this.physicsAccumulator += frameDt;

    // Cap accumulator to prevent death spiral on lag spikes
    if (this.physicsAccumulator > 100) this.physicsAccumulator = 100;

    while (this.physicsAccumulator >= this.FIXED_TIMESTEP) {
      Engine.update(this.physicsEngine, this.FIXED_TIMESTEP);
      this.physicsAccumulator -= this.FIXED_TIMESTEP;
    }

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
    // ✅ NEW: Update Invisible Remote Players (Proximity Check)
    const now = Date.now();
    const DETECTION_RADIUS = 150;

    // Uncomment this if it still fails - it will spam logs if working!
    // if (this.invisibleRemotePlayers.size > 0) console.log("Processing invis players...");

    this.invisibleRemotePlayers.forEach((expireTime, id) => {
      const remoteSprite = this.multiplayer.otherPlayers[id];

      // 1. Cleanup if expired or player disconnected
      if (now > expireTime || !remoteSprite) {
        // Only delete if EXPIRED. If sprite is missing (lag), keep tracking!
        if (now > expireTime) {
          this.invisibleRemotePlayers.delete(id);
          if (remoteSprite) remoteSprite.alpha = 1.0;
        }
        return;
      }

      // 2. Distance Check
      const mySprite = this.playerActor.sprite;
      const dx = mySprite.x - remoteSprite.x;
      const dy = mySprite.y - remoteSprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 3. Dynamic Alpha
      if (dist < DETECTION_RADIUS) {
        remoteSprite.alpha = 0.3; // Ghost
      } else {
        remoteSprite.alpha = 0; // Hidden
      }
    });
  } //update() end

  // ✅ NEW: Helper for floating text
  private showFloatingText(
    message: string,
    x: number,
    y: number,
    color: number,
  ) {
    // 1. Create Text
    const style = new TextStyle({
      fontFamily: "GameFont",
      fontSize: 24,
      fontWeight: "bold",
      fill: color, // e.g. 0x00FF00 (Green) or 0xFF0000 (Red)
      stroke: { color: "#000000", width: 4 }, // v8 syntax
      align: "center",
    });

    const text = new Text({ text: message, style }); // v8 syntax
    text.anchor.set(0.5);
    text.position.set(x, y - 50); // Start above player
    this.world.addChild(text);

    // 2. Animate (Float up & Fade)
    let elapsed = 0;
    const duration = 1.0;

    const animate = (ticker: Ticker) => {
      const dt = ticker.deltaTime / 60;
      elapsed += dt;

      text.y -= 1.0 * ticker.deltaTime; // Float up
      text.alpha = Math.max(0, 1 - elapsed / duration); // Fade out

      if (elapsed >= duration) {
        App.pixi.ticker.remove(animate);
        if (text.parent) text.parent.removeChild(text);
        text.destroy();
      }
    };

    App.pixi.ticker.add(animate);
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

    // ✅ CHECK CAMERA STATE
    // If camera is missing or disabled, we enter "Overview Mode"
    const isCameraActive = this.camera && this.camera.isEnabled;

    if (!isCameraActive) {
      // ----------------------------------------
      // MODE 1: FIT TO SCREEN (Overview)
      // ----------------------------------------
      // Calculate scale to fit the entire map within the current screen
      const scale = Math.min(screenW / mapW, screenH / mapH);

      this.world.scale.set(scale);

      // Center the map vertically and horizontally
      this.world.x = (screenW - mapW * scale) / 2;
      this.world.y = (screenH - mapH * scale) / 2;
    } else {
      // ----------------------------------------
      // MODE 2: GAMEPLAY (Fixed Zoom)
      // ----------------------------------------
      // Use 1.0 (or your preferred zoom) so 1440p monitors see more area
      this.world.scale.set(1.0);

      // We DO NOT set this.world.x/y here because
      // this.camera.update() will overwrite it every frame anyway.
    }
    // ✅ HUD Positioning (Always stays in screen corners)
    if (this.parryUI) {
      this.parryUI.x = screenW - 20;
      this.parryUI.y = screenH - 20;
    }
    if (this.gameHUD) {
      const w = App.pixi.renderer.width;
      const h = App.pixi.renderer.height;
      this.gameHUD.resize(w, h);
    }
    //  Resize the UI
    if (this.countdownUI) {
      this.countdownUI.resize(
        App.pixi.renderer.width,
        App.pixi.renderer.height,
      );
    }
  }

  // ✅ NEW: Helper to Cancel Attack
  private cancelAttack() {
    if (this.activeAttack.isAttacking) {
      socket.emit("endAttack");
    }
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
    }

    if (closestId) {
      // Start the Clock!
      this.activeAttack.isAttacking = true;
      this.activeAttack.targetId = closestId;
      this.activeAttack.timer = 0;
      this.playerActor.infectionIndicator.show();
      //tell server we are attacking
      socket.emit("startAttack");
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

    // ✅ BURN COOLDOWN IMMEDIATELY (Miss or Hit, CD is used)
    this.playerActor.parryCooldownEnd = Date.now() + 30000;
    // Force UI update immediately so user sees "30"
    this.parryUI.updateState(this.playerActor.parryCooldownEnd);

    const parryRange = 80;
    let targetZombieId: string | null = null;

    for (const [id, remoteChar] of Object.entries(
      this.multiplayer.otherPlayers,
    )) {
      const dx = this.playerActor.body.position.x - remoteChar.x;
      const dy = this.playerActor.body.position.y - remoteChar.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < parryRange && remoteChar instanceof Infected) {
        targetZombieId = id;
        break;
      }
    }

    if (targetZombieId) {
      console.log("Attempting parry on:", targetZombieId);
      // We send the request. If the server says "Yes, he was attacking",
      // it will send back 'playerFrozen', which we already listen for.
      socket.emit("parryZombie", targetZombieId);
    } else {
      console.log("Parry Missed (No zombies in range)");
      this.showFloatingText(
        "Missed!",
        this.playerActor.sprite.x,
        this.playerActor.sprite.y,
        0xff0000,
      );
    }
  }
  // ✅ NEW: Handles Visuals for Speed/Invis
  private handlePowerUpVisuals(
    playerId: string,
    type: "speed" | "invis",
    duration: number,
  ) {
    const isMe = playerId === this.myPlayerId;
    let targetSprite: BaseCharacter | null = null;

    // 1. Determine Target Sprite
    if (isMe) {
      targetSprite = this.playerActor.sprite;
      // Show HUD Text
      const color = type === "speed" ? 0x00ffff : 0xaaaaaa;
      const text = type === "speed" ? "SPEED UP!" : "INVISIBLE!";
      this.gameHUD.showPowerUpStatus(text, duration, color);
    } else {
      targetSprite = this.multiplayer.otherPlayers[playerId];
    }

    // 2. REGISTER INVISIBILITY IMMEDIATELY (Before checking sprite existence)
    if (type === "invis") {
      if (isMe) {
        this.playerActor.isInvisible = true;
        setTimeout(() => {
          this.playerActor.isInvisible = false;
        }, duration);
      } else {
        // ✅ FIX: Track them even if the sprite isn't rendered yet
        const expiration = Date.now() + duration;
        this.invisibleRemotePlayers.set(playerId, expiration);
        console.log(`Tracking invis player: ${playerId} until ${expiration}`);
      }
    }

    // 3. Apply Immediate Visuals (If sprite exists right now)
    if (!targetSprite) return;

    if (type === "speed") {
      targetSprite.tint = 0x00ffff;
      setTimeout(() => {
        if (targetSprite) targetSprite.tint = 0xffffff;
      }, duration);
    } else if (type === "invis") {
      if (isMe) {
        targetSprite.alpha = 0.5;
        setTimeout(() => {
          if (targetSprite) targetSprite.alpha = 1.0;
        }, duration);
      } else {
        targetSprite.alpha = 0; // Immediate hide
      }
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
  spawnPowerUp(type: "speed" | "invis", x: number, y: number, id?: string) {
    if (!this.powerUpManager) {
      console.error("DEBUG ERROR: PowerUpManager is missing!");
      return;
    }

    console.log(`DEBUG: Spawning ${type} at ${x}, ${y}`); // Log 2
    const scale = 0.15;
    if (type === "speed") {
      const speedUp = new SpeedPowerUp({
        x,
        y,
        id: id,
        scale: scale,
        durationMs: 10000,
        hooks: {
          onPickup: () => {
            if (id) sendPowerUpCollected(id);
          },
          getSpeed: () => this.playerActor.moveSpeed, // Ensure 'moveSpeed' exists on PlayerActor
          setSpeed: (v) => {
            this.playerActor.moveSpeed = v;
            // ✅ Trigger Visuals ON
            if (v > 5) {
              // Assuming 5 is base speed
              this.playerActor.setTint(0x00ffff); // Blue Glow
              this.gameHUD.showPowerUpStatus("SPEED UP!", 10000, 0x00ffff);
            } else {
              // ✅ Trigger Visuals OFF
              this.playerActor.clearTint();
            }
          },
        },
      });
      this.powerUpManager.add(speedUp);
    } else if (type === "invis") {
      const invis = new InvisibilityPowerUp({
        x,
        y,
        id: id,
        durationMs: 8000,
        hooks: {
          //server knows it was collected!
          onPickup: () => {
            if (id) sendPowerUpCollected(id);
            this.gameHUD.showPowerUpStatus("INVISIBLE!", 8000, 0xaaaaaa);
          },
          setAlpha: (v) => (this.playerActor.sprite.alpha = v),
          setIsInvisible: (b) => (this.playerActor.isInvisible = b), // Ensure 'isInvisible' exists on PlayerActor
        },
      });
      this.powerUpManager.add(invis);
    }
  }

  // ✅ UPDATED CLEANUP (Destroys Multiplayer to stop leaks)
  override destroyScene() {
    window.removeEventListener("resize", this.resizeHandler);
    App.pixi.ticker.remove(this.tickerFn);
    // 2. ✅ Remove ALL Socket Listeners
    // (If we don't do this, the old scene ghost keeps listening!)
    socket.off("playerInfected");
    socket.off("playerFrozen");
    socket.off("parryFailed");
    socket.off("matchUpdate");
    socket.off("playerDied");
    socket.off("gameOver");
    socket.off("lobbyTimer");
    socket.off("returnToLobby");
    socket.off("spawnPowerUp");
    socket.off("removePowerUp");

    //Destroy multiplayer to remove socket listeners
    if (this.multiplayer) {
      this.multiplayer.destroy();
    }
    if (this.physicsEngine) {
      World.clear(this.physicsEngine.world, false);
      Engine.clear(this.physicsEngine);
    }
    super.destroyScene();
  }
}

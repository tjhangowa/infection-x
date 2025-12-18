import { Container, Sprite, Assets, Graphics, Ticker, FederatedPointerEvent, Texture } from "pixi.js";
import { BaseScene } from "./BaseScene";
import { App } from "../core/app";
import { Platform } from "../objects/Platform"
import { Engine, World, Bodies, Body } from "matter-js";

type PlatformConfigJson = {
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  color: number;
  rotation?: number;
};

export class DemoMapScene extends BaseScene {
    private world!: Container;
    private mapSprite!: Sprite;

    private player!: Graphics;
    private playerBody!:Body;
    private platforms: Platform[] = [];
    private platformConfigData: PlatformConfigJson[] = [];
    private physicsEngine!: Engine;

    private keys = new Set<string>();
    private speed = 5;
    private editorMode = false;
    private mapScale = 1;

    // editor state
    private selectedPlatform: Platform | null = null;
    private draggingPlatform = false;
    private dragOffset = { x: 0, y: 0 };
    private snapToGrid = false;
    private gridSize = 32;

    // keep references so we can remove them in destroyScene
    private resizeHandler = () => this.layout();
    private tickerFn = (ticker: Ticker) => this.update(ticker.deltaTime);

    private platformTexture!: Texture;

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

        this.platformTexture = await Assets.load("/assets/Platforms/platform_grass.png");
        await this.loadPlatformConfig();

        this.physicsEngine = Engine.create({
          gravity: { x: 0, y:1 }
        })

        // Create a simple player marker
        this.player = new Graphics();
        const playerRadius = 18;
        this.player
            .circle(0, 0, playerRadius)
            .fill(0x00ff00);
        // Start roughly center of the map
        this.player.x = texture.width / 2;
        this.player.y = texture.height / 2;

        this.world.addChild(this.player);
        const playerOptions: Matter.IChamferableBodyDefinition = {
          friction: 0.1,
          restitution: 0,
        };
        this.playerBody = Bodies.circle(
          this.player.x,
          this.player.y,
          playerRadius,
          playerOptions
        );
        World.add(this.physicsEngine.world, this.playerBody);


        this.createPlatforms();

        // Input + ticker
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("resize", this.resizeHandler);
        // editor pointer handlers
        App.pixi.stage.eventMode = "static";
        App.pixi.stage.on("pointermove", this.onPointerMove);
        App.pixi.stage.on("pointerup", this.onPointerUp);

        App.pixi.ticker.add(this.tickerFn);

        this.editorMode = false;
        this.layout(); // initial camera positioning
    }


    // Input handlers 
    private onKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        this.keys.add(key);

        // toggle editor mode
        if (e.key === "e") {
            this.editorMode = !this.editorMode;
            this.layout();
            console.log("Editor mode:", this.editorMode ? "ON" : "OFF");
            return;
        }

        if (!this.editorMode) {
            // normal gameplay keys only
            return;
        }

        // --- editor-only hotkeys ---
        switch (key) {
            case "g":
                this.snapToGrid = !this.snapToGrid;
                console.log("Snap to grid:", this.snapToGrid);
                break;
            case "n":
                this.addPlatformAtScreenCenter();
                break;
            case "j":
                this.exportPlatformsJson();
                break;
            case "arrowleft":
                this.resizeSelectedPlatform(-10, 0); // shrink width
                break;
            case "arrowright":
                this.resizeSelectedPlatform(10, 0);  // grow width
                break;
            case "arrowup":
                this.resizeSelectedPlatform(0, 10); // shrink height
                break;
            case "arrowdown":
                this.resizeSelectedPlatform(0, -10);  // grow height
                break;
            case "r":
                this.rotateSelectedPlatform(-5); // rotate 5 degrees counterclockwise
                break;
            case "t":
                this.rotateSelectedPlatform(5); // rotate 5 degrees clockwise
                break;
            case "delete":
            case "backspace":
                this.deleteSelectedPlatform();
                break;
        }
    };

    private onKeyUp = (e: KeyboardEvent) => {
        this.keys.delete(e.key.toLowerCase());
    };

    // Per-frame update 
    private update(delta: number) {
      if (!this.player || !this.world || !this.mapSprite || !this.playerBody) return;
      if (this.editorMode) return;

      // --- INPUT → desired horizontal velocity ---
      let moveX = 0;

      if (this.keys.has("a") || this.keys.has("arrowleft")) moveX -= 1;
      if (this.keys.has("d") || this.keys.has("arrowright")) moveX += 1;

      // Normalize and scale
      if (moveX !== 0) {
          moveX = Math.sign(moveX) * this.speed;
      }

      // Keep existing vertical velocity (gravity will change it)
      const currentVel = this.playerBody.velocity;
      Body.setVelocity(this.playerBody, {
          x: moveX,
          y: currentVel.y,
      });

      // Optionally: super simple "jump" just to test
      if (this.keys.has("w") || this.keys.has("arrowup")) {
          Body.setVelocity(this.playerBody, {
              x: this.playerBody.velocity.x,
              y: -12, // jump impulse
          });
      }

      // --- STEP PHYSICS ---
      if (this.physicsEngine) {
          const dtMs = (delta || 1) * (1000 / 60);
          Engine.update(this.physicsEngine, dtMs);
      }

      // --- SYNC GRAPHICS FROM PHYSICS BODY ---
      this.player.x = this.playerBody.position.x;
      this.player.y = this.playerBody.position.y;

      // Optionally clamp *body* to map bounds if you want
      const mapW = this.mapSprite.texture.width;
      const mapH = this.mapSprite.texture.height;
      const r = 18;

      const clampedX = Math.max(r, Math.min(mapW - r, this.playerBody.position.x));
      const clampedY = Math.max(r, Math.min(mapH - r, this.playerBody.position.y));
      Body.setPosition(this.playerBody, { x: clampedX, y: clampedY });

      // Re-sync after clamp
      this.player.x = this.playerBody.position.x;
      this.player.y = this.playerBody.position.y;

      this.updateCamera();
  }

    // Camera follow logic
    private updateCamera() {
        if (!this.player || !this.world) return;

        const app = App.pixi;
        const screenW = app.renderer.width;
        const screenH = app.renderer.height;

        const mapW = this.mapSprite.texture.width;
        const mapH = this.mapSprite.texture.height;

        // position world so that player stays in the center of the screen
        const targetX = -this.player.x + screenW / 2;
        const targetY = -this.player.y + screenH / 2;

        const worldMinX = screenW - mapW; 
        const worldMaxX = 0;              

        const worldMinY = screenH - mapH; 
        const worldMaxY = 0;              

        // Clamp world position
        this.world.x = Math.min(worldMaxX, Math.max(worldMinX, targetX));
        this.world.y = Math.min(worldMaxY, Math.max(worldMinY, targetY));
    }

    private layout() {
        if (!this.mapSprite || !this.world || !this.player) return;

        if (this.editorMode) {
            // Zoom out to see the whole map
            const app = App.pixi;
            const screenW = app.renderer.width;
            const screenH = app.renderer.height;
    
            const mapW = this.mapSprite.texture.width;
            const mapH = this.mapSprite.texture.height;
    
            // Fit map inside screen (keep aspect ratio)
            this.mapScale = Math.min(screenW / mapW, screenH / mapH);
            this.world.scale.set(this.mapScale);
    
            // Center the map
            this.world.x = (screenW - mapW * this.mapScale) / 2;
            this.world.y = (screenH - mapH * this.mapScale) / 2;
        } else {
            // Normal gameplay camera
            this.world.scale.set(1);
            this.updateCamera();
        }
    }
    private async loadPlatformConfig() {
      try {
          const res = await fetch("/config/demoMapPlatforms.json");
          if (!res.ok) {
              console.error("Failed to load platform config JSON", res.status, res.statusText);
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
      const tileH = this.platformTexture.height;

    
      for (const cfg of this.platformConfigData) {
        const p = new Platform({
          x: cfg.xRatio * mapW,
          y: cfg.yRatio * mapH,
          width: cfg.wRatio * mapW,
          height: tileH,
          color: cfg.color,
          rotation:cfg.rotation ?? 0,
        }, this.platformTexture);
        // editor interaction
        p.eventMode = "static";
        p.cursor = "pointer";
        p.on("pointerdown", (e: FederatedPointerEvent) =>
            this.onPlatformPointerDown(e, p)
        );
        this.platforms.push(p);
        this.world.addChild(p);
        
        if (this.physicsEngine){
          World.add(this.physicsEngine.world, p.body);
        }
      }
    }
    private selectPlatform(p: Platform | null) {
        if (this.selectedPlatform === p) return;

        if (this.selectedPlatform) {
            this.selectedPlatform.setSelected(false);
        }

        this.selectedPlatform = p;

        if (this.selectedPlatform) {
            this.selectedPlatform.setSelected(true);
        }
    }

    private onPlatformPointerDown = (e: FederatedPointerEvent, p: Platform) => {
        if (!this.editorMode) return;

        e.stopPropagation(); // don't let world click get it
        this.selectPlatform(p);

        this.draggingPlatform = true;

        // compute drag offset in world space
        const worldPos = this.world.toLocal(e.global);
        this.dragOffset.x = worldPos.x - p.config.x;
        this.dragOffset.y = worldPos.y - p.config.y;
    };

    private onPointerMove = (e: FederatedPointerEvent) => {
        if (!this.editorMode) return;
        if (!this.draggingPlatform || !this.selectedPlatform) return;

        const worldPos = this.world.toLocal(e.global);
        let newX = worldPos.x - this.dragOffset.x;
        let newY = worldPos.y - this.dragOffset.y;

        if (this.snapToGrid) {
            newX = Math.round(newX / this.gridSize) * this.gridSize;
            newY = Math.round(newY / this.gridSize) * this.gridSize;
        }

        this.selectedPlatform.config.x = newX;
        this.selectedPlatform.config.y = newY;
        this.selectedPlatform.refreshFromConfig();
    };

    private onPointerUp = (_e: FederatedPointerEvent) => {
        this.draggingPlatform = false;
    };
    private addPlatformAtScreenCenter() {
        if (!this.mapSprite) return;

        const app = App.pixi;
        const screenW = app.renderer.width;
        const screenH = app.renderer.height;

        // convert screen center to world coords
        const worldPos = this.world.toLocal({ x: screenW / 2, y: screenH / 2 } as any);

        const tileH = this.platformTexture?.height ?? 32;

        const width = 64;   // sensible default for editor-created platforms
        const height = tileH;

        const p = new Platform(
          {
            x: worldPos.x,
            y: worldPos.y,
            width,
            height,
            color: 0xffffff,
            rotation: 0,
          },
          this.platformTexture,
        );

        p.eventMode = "static";
        p.cursor = "pointer";
        p.on("pointerdown", (e: FederatedPointerEvent) =>
            this.onPlatformPointerDown(e, p)
        );

        this.platforms.push(p);
        this.world.addChild(p);

        this.selectPlatform(p);
        console.log("Added platform at", worldPos);
    }

    private deleteSelectedPlatform() {
        if (!this.selectedPlatform) return;

        const idx = this.platforms.indexOf(this.selectedPlatform);
        if (idx >= 0) this.platforms.splice(idx, 1);

        this.world.removeChild(this.selectedPlatform);
        this.selectedPlatform.destroy();
        this.selectedPlatform = null;

        console.log("Deleted selected platform");
    }

    private exportPlatformsJson() {
        if (!this.mapSprite) return;

        const mapW = this.mapSprite.texture.width;
        const mapH = this.mapSprite.texture.height;

        const exportData = this.platforms.map((p) => {
            const cfg = p.config;
            return {
                xRatio: cfg.x / mapW,
                yRatio: cfg.y / mapH,
                wRatio: cfg.width / mapW,
                hRatio: cfg.height / mapH,
                color: cfg.color,
                rotation: cfg.rotation ?? 0,
            };
        });

        console.log(
            "Platform JSON:" + JSON.stringify(exportData, null, 2)
          );
    }


    private resizeSelectedPlatform(widthDelta: number, heightDelta: number) {
        if (!this.selectedPlatform) return;
    
        const cfg = this.selectedPlatform.config;
    
        // Minimum size so it never collapses
        const minW = 10;
        const minH = 5;
    
        cfg.width = Math.max(minW, cfg.width + widthDelta);
        cfg.height = Math.max(minH, cfg.height + heightDelta);
    
        this.selectedPlatform.refreshFromConfig();
    }
    private rotateSelectedPlatform(deltaDegrees: number) {
        if (!this.selectedPlatform) return;
    
        const cfg = this.selectedPlatform.config as any;
        const currentRotation = cfg.rotation ?? 0; // radians
        const deltaRadians = (deltaDegrees * Math.PI) / 180;
    
        cfg.rotation = currentRotation + deltaRadians;
        this.selectedPlatform.refreshFromConfig();
    }


    override destroyScene() {
        // Clean up listeners and ticker so they don't fire after scene change
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("resize", this.resizeHandler);
        App.pixi.ticker.remove(this.tickerFn);
        App.pixi.stage.off("pointermove", this.onPointerMove);
        App.pixi.stage.off("pointerup", this.onPointerUp);

        super.destroyScene();
    }
}
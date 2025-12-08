import { Container, Sprite, Assets, Graphics, Ticker, FederatedPointerEvent } from "pixi.js";
import { BaseScene } from "./BaseScene";
import { App } from "../core/app";
import { Platform } from "../objects/Platform"

export class DemoMapScene extends BaseScene {
    private world!: Container;
    private mapSprite!: Sprite;
    private player!: Graphics;
    private platforms: Platform[] = [];

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

        // Create a simple player marker
        this.player = new Graphics();
        this.player
            .circle(0, 0, 18)
            .fill(0x00ff00);
        // Start roughly center of the map
        this.player.x = texture.width / 2;
        this.player.y = texture.height / 2;
        this.world.addChild(this.player);

        this.createTempPlatforms();

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
        if (!this.player || !this.world || !this.mapSprite) return;
        if (this.editorMode) return;

        let dx = 0;
        let dy = 0;

        if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
        if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
        if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
        if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

        if (dx === 0 && dy === 0) {
            // nothing pressed, just keep camera where it is
            return;
        }

        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        const step = this.speed * (delta || 1);
        this.player.x += dx * step;
        this.player.y += dy * step;

        // Clamp player to map bounds
        const mapW = this.mapSprite.texture.width;
        const mapH = this.mapSprite.texture.height;
        const r = 18; // player radius

        this.player.x = Math.max(r, Math.min(mapW - r, this.player.x));
        this.player.y = Math.max(r, Math.min(mapH - r, this.player.y));

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

        const width = 20;
        const height = 20;

        const p = new Platform({
            x: worldPos.x,
            y: worldPos.y,
            width,
            height,
            color: 0x8888ff,
        });

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

        console.log("Platform JSON:", JSON.stringify(exportData, null, 2));
    }

    private createTempPlatforms() {
        const mapW = this.mapSprite.texture.width;
        const mapH = this.mapSprite.texture.height;
      
        for (const cfg of PLATFORM_CONFIG) {
          const p = new Platform({
            x: cfg.xRatio * mapW,
            y: cfg.yRatio * mapH,
            width: cfg.wRatio * mapW,
            height: cfg.hRatio * mapH,
            color: cfg.color,
            rotation:cfg.rotation ?? 0,
          });
          // editor interaction
          p.eventMode = "static";
          p.cursor = "pointer";
          p.on("pointerdown", (e: FederatedPointerEvent) =>
              this.onPlatformPointerDown(e, p)
          );
          this.platforms.push(p);
          this.world.addChild(p);
        }
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
const PLATFORM_CONFIG :{
    xRatio: number;
    yRatio: number;
    wRatio: number;
    hRatio: number;
    color: number;
    rotation?: number;
}[] =  [
    {
      xRatio: 0.10310965630114573,
      yRatio: 0.9859065284597199,
      wRatio: 0.203125,
      hRatio: 0.013888888888888888,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.0040916530278232496,
      yRatio: 0.4956355701036553,
      wRatio: 0.5583333333333333,
      hRatio: 0.013888888888888888,
      color: 8947967,
      rotation: 1.5707963267948961
    },
    {
      xRatio: 0.07037643207855977,
      yRatio: 0.8476995844049472,
      wRatio: 0.0375,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.08726646259971645
    },
    {
      xRatio: 0.05728314238952538,
      yRatio: 0.7618657966483321,
      wRatio: 0.0375,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.17453292519943292
    },
    {
      xRatio: 0.04991816718468222,
      yRatio: 0.5160029057281283,
      wRatio: 0.03229166666666667,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.4363323129985824
    },
    {
      xRatio: 0.04991816693944359,
      yRatio: 0.6032915054985096,
      wRatio: 0.0375,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 8.326672684688674e-17
    },
    {
      xRatio: 0.050736497790246825,
      yRatio: 0.6818512459882807,
      wRatio: 0.0375,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.2617993877991494
    },
    {
      xRatio: 0.045826517181468546,
      yRatio: 0.37197671914875047,
      wRatio: 0.027083333333333334,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.43633231299858244
    },
    {
      xRatio: 0.09247136145341482,
      yRatio: 0.357428619289436,
      wRatio: 0.027083333333333334,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.349065850398866
    },
    {
      xRatio: 0.04500818616717287,
      yRatio: 0.2992362196473469,
      wRatio: 0.021875,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.0872664625997165
    },
    {
      xRatio: 0.045826514402097535,
      yRatio: 0.4243498840498394,
      wRatio: 0.027083333333333334,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.33387888707037655,
      yRatio: 0.9684488088743407,
      wRatio: 0.15208333333333332,
      hRatio: 0.013888888888888888,
      color: 8947967,
      rotation: -0.17453292519943286
    },
    {
      xRatio: 0.11374797730766217,
      yRatio: 0.4345335515548282,
      wRatio: 0.036458333333333336,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.4363323129985824
    },
    {
      xRatio: 0.4369885433715222,
      yRatio: 0.9204400800145482,
      wRatio: 0.08854166666666667,
      hRatio: 0.013888888888888888,
      color: 8947967,
      rotation: -0.4363323129985824
    },
    {
      xRatio: 0.8968903436988543,
      yRatio: 0.9902709583560648,
      wRatio: 0.203125,
      hRatio: 0.013888888888888888,
      color: 8947967,
      rotation: -8.326672684688674e-17
    },
    {
      xRatio: 0.6415711947626842,
      yRatio: 0.9553555191853066,
      wRatio: 0.15625,
      hRatio: 0.018518518518518517,
      color: 8947967,
      rotation: 0.43633231299858233
    },
    {
      xRatio: 0.5057283142389526,
      yRatio: 0.7909619930896526,
      wRatio: 0.015625,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5417348608837972,
      yRatio: 0.7909619930896526,
      wRatio: 0.015625,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5073649754500819,
      yRatio: 0.74295326422986,
      wRatio: 0.015625,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.544189852700491,
      yRatio: 0.7400436442989634,
      wRatio: 0.015625,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5032733224222586,
      yRatio: 0.8491543917075834,
      wRatio: 0.010416666666666666,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5368248772504093,
      yRatio: 0.8506092016730316,
      wRatio: 0.010416666666666666,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5196399345335516,
      yRatio: 0.9131660301873069,
      wRatio: 0.10416666666666667,
      hRatio: 0.018518518518518517,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5032733224222586,
      yRatio: 0.687670485542826,
      wRatio: 0.010416666666666666,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5368248772504093,
      yRatio: 0.6876704855428262,
      wRatio: 0.010416666666666666,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.5335515548281506,
      yRatio: 0.6367521367521369,
      wRatio: 0.010416666666666666,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.4459901800327332,
      yRatio: 0.6483906164757225,
      wRatio: 0.0625,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.3490658503988659
    },
    {
      xRatio: 0.3829787234042553,
      yRatio: 0.6338425168212403,
      wRatio: 0.078125,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.42798690671031103,
      yRatio: 0.5305510092744136,
      wRatio: 0.078125,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.5235987755982988
    },
    {
      xRatio: 0.342062193126023,
      yRatio: 0.4636297508637933,
      wRatio: 0.08854166666666667,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.6981317007977318
    },
    {
      xRatio: 0.28068739770867435,
      yRatio: 0.294871794871795,
      wRatio: 0.11979166666666667,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.5235987755982988
    },
    {
      xRatio: 0.42389525368248776,
      yRatio: 0.38216039279869074,
      wRatio: 0.078125,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.26179938779914935
    },
    {
      xRatio: 0.5728314238952537,
      yRatio: 0.5960174577195854,
      wRatio: 0.052083333333333336,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.4363323129985824
    },
    {
      xRatio: 0.6194762684124387,
      yRatio: 0.5756501182033097,
      wRatio: 0.06770833333333333,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    },
    {
      xRatio: 0.7103109656301146,
      yRatio: 0.549463538825241,
      wRatio: 0.11979166666666667,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.6981317007977318
    },
    {
      xRatio: 0.6685761047463177,
      yRatio: 0.5087288597926897,
      wRatio: 0.046875,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.17453292519943295
    },
    {
      xRatio: 0.5900163666121114,
      yRatio: 0.48545190034551733,
      wRatio: 0.06770833333333333,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0.5235987755982988
    },
    {
      xRatio: 0.6481178396072014,
      yRatio: 0.4388979814511729,
      wRatio: 0.041666666666666664,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.6108652381980153
    },
    {
      xRatio: 0.5139116202945991,
      yRatio: 0.46944899072558655,
      wRatio: 0.036458333333333336,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.26179938779914935
    },
    {
      xRatio: 0.41243862520458274,
      yRatio: 0.23667939625386442,
      wRatio: 0.078125,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.3490658503988659
    },
    {
      xRatio: 0.4803600654664485,
      yRatio: 0.28614293507910515,
      wRatio: 0.078125,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.4363323129985824
    },
    {
      xRatio: 0.6873977086743045,
      yRatio: 0.2992362247681396,
      wRatio: 0.078125,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: -0.4363323129985824
    },
    {
      xRatio: 0.5793780687397709,
      yRatio: 0.33415166393889806,
      wRatio: 0.06770833333333333,
      hRatio: 0.004629629629629629,
      color: 8947967,
      rotation: 0
    }
  ];
import { Container, Sprite, Assets, Ticker } from "pixi.js";
import { Multiplayer } from "../network/multiplayer";
import { Tom } from "../characters/Tom";
import { Mike } from "../characters/Mike";
import { Jenny } from "../characters/Jenny";
import { keys } from "../input/keyboard";
//import { sendMove } from "../network/socket";
import { BaseCharacter } from "../characters/BaseCharacter";
export class DemoMapScene extends Container {
  private player!: BaseCharacter;
  private speed = 4;
  private lastFacing: "east" | "west" = "east";
  async load() {
    // Load background
    const bgTex = await Assets.load(
      "assets/demomap/Background/infectionxspacemapbgedit.png",
    );
    const bg = new Sprite(bgTex);
    bg.width = window.innerWidth;
    bg.height = window.innerHeight;
    this.addChild(bg);

    // Load tile texture
    const tileTex = await Assets.load(
      "assets/demomap/kenney_new_platformer-pack-1.0/Sprites/Tiles/Default/terrain_stone_block_top.png",
    );

    const PLATFORM_WIDTH = 600;
    const startX = (window.innerWidth - PLATFORM_WIDTH) / 2;
    const platformY = 800;

    // Create horizontally centered platform
    for (let x = 0; x < PLATFORM_WIDTH; x += tileTex.width) {
      const tile = new Sprite(tileTex);
      tile.x = startX + x;
      tile.y = 800;
      this.addChild(tile);
    }

    //preload all characters (for random assignment)
    await Promise.all([
      Tom.loadAssets(),
      Jenny.loadAssets(),
      Mike.loadAssets(),
    ]);

    // ✅ TEMP: spawn random character (SERVER will replace this next)
    const choices = ["tom", "jenny", "mike"] as const;
    const random = choices[Math.floor(Math.random() * choices.length)];

    this.spawnCharacter(random, startX + PLATFORM_WIDTH / 2, platformY - 50);
    new Multiplayer(this, (type: string) => {
      console.log("Received spawn request in Demo Scene:", type);
    });
    Ticker.shared.add(() => this.update());
  }

  private spawnCharacter(type: "tom" | "jenny" | "mike", x: number, y: number) {
    if (type === "tom") this.player = new Tom();
    if (type === "jenny") this.player = new Jenny();
    if (type === "mike") this.player = new Mike();

    this.player.x = x;
    this.player.y = y;
    this.addChild(this.player);
  }

  private update() {
    let movingHorizontally = false;
    let movingVertically = false;

    if (keys["a"]) {
      this.player.x -= this.speed;
      this.player.playAnimation("run_west");
      this.lastFacing = "west";
      movingHorizontally = true;
    }

    if (keys["d"]) {
      this.player.x += this.speed;
      this.player.playAnimation("run_east");
      this.lastFacing = "east";
      movingHorizontally = true;
    }

    if (keys["w"]) {
      this.player.y -= this.speed;
      movingVertically = true;
    }

    if (keys["s"]) {
      this.player.y += this.speed;
      movingVertically = true;
    }

    // ✅ ONLY idle when NOT moving at all
    if (!movingHorizontally && !movingVertically) {
      if (this.lastFacing === "east") {
        this.player.playAnimation("idle_east");
      } else {
        this.player.playAnimation("idle_west");
      }
    }

    // ✅ Sync with server
    // sendMove(
    // this.player.x,
    // this.player.y,
    // this.lastFacing === "east"
    //  ? movingHorizontally || movingVertically
    //  ? "run_east"
    // : "idle_east"
    // : movingHorizontally || movingVertically
    // ? "run_west"
    // : "idle_west",
    // );
  }
}

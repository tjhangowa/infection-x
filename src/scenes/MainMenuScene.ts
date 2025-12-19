iate background?: Sprite;
  private title?: Text;

  private infoButton?: Container;
  private startButton?: Container;
  private settingsButton?: Container;

  private resizeHandler = () => this.layout();

  constructor() {
    super();
    this.sortableChildren = true;
  }

  async load() {
    await this.loadBackground();
    await this.loadFont();
    ModalManager.init(this);
    this.createTitle();
    this.createButtons();
    this.layout();

    window.addEventListener("resize", this.resizeHandler);
  }

mport { Container, Sprite, Text, Assets } from "pixi.js";
import { App } from "../core/app";
import { BaseScene } from "../scenes/BaseScene";
import { createTextButton } from "../ui/TextButton";
import { showInfoModal } from "../ui/InfoModal";
import { showSettingsModal } from "../ui/SettingsModal";
import { ModalManager } from "../ui/ModalManager";
import { SceneManager } from "../core/SceneManager";
import { WaitingLobbyScene } from "./WaitingLobbyScene";

export class MainMenuScene extends BaseScene {
  private background?: Sprite;
  private title?: Text;

  private infoButton?: Container;
  private startButton?: Container;
  private settingsButton?: Container;

  private resizeHandler = () => this.layout();

  constructor() {
    super();
    this.sortableChildren = true;
  }

  async load() {
    await this.loadBackground();
    await this.loadFont();
    ModalManager.init(this);
    this.createTitle();
    this.createButtons();
    this.layout();

    window.addEventListener("resize", this.resizeHandler);
  }

  private async loadBackground() {
    const texture = await Assets.load("/assets/Maps/postapocalypse2.png");
    this.background = new Sprite(texture);
    this.background.anchor.set(0);
    this.background.zIndex = 0;
    this.addChild(this.background);
  }

  private async loadFont() {
    // ✅ FIX: Check if font is already loaded to prevent errors on replay
    if (document.fonts.check("10px GameFont")) {
      return; // Font already exists, skip loading
    }

    try {
      const fontFace = new FontFace("GameFont", "url(/assets/upheavtt.ttf)");
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch (e) {
      console.warn("Font loading skipped or failed:", e);
    }
  }

  private createTitle() {
    this.title = new Text("INFECTION\nX", {
      fontFamily: "GameFont",
      fontSize: 160,
      align: "center",
      fontWeight: "bold",
      fill: "#E1D3AE",
      letterSpacing: 7,
      dropShadow: {
        color: "#000",
        alpha: 1,
        blur: 0,
        angle: Math.PI / 4,
        distance: 12,
      },
    });

    this.addChild(this.title);
  }

  private createButtons() {
    this.infoButton = createTextButton("INFO", () => showInfoModal());

    // ✅ UPDATED START BUTTON
    this.startButton = createTextButton("START", () => {
      // Switch to Lobby. The Lobby scene handles the 'joinLobby' socket event automatically.
      SceneManager.changeScene(new WaitingLobbyScene());
    });

    this.settingsButton = createTextButton("SETTINGS", () =>
      showSettingsModal(),
    );

    this.addChild(this.infoButton, this.startButton, this.settingsButton);
  }

  private layout() {
    if (
      !this.background ||
      !this.title ||
      !this.startButton ||
      !this.infoButton ||
      !this.settingsButton ||
      !this.background.texture
    ) {
      return;
    }

    const w = App.pixi.renderer.width;
    const h = App.pixi.renderer.height;

    // Background resize
    const scale = Math.max(
      w / this.background.texture.width,
      h / this.background.texture.height,
    );
    this.background.scale.set(scale);

    // Title placement
    this.title.x = (w - this.title.width) / 2;
    this.title.y = 24;

    // Button placement
    const centerX = w / 2;
    const baseY = h * 0.85;
    const gap = 300;

    this.startButton.x = centerX;
    this.startButton.y = baseY;

    this.infoButton.x = centerX - gap;
    this.infoButton.y = baseY;

    this.settingsButton.x = centerX + gap;
    this.settingsButton.y = baseY;
  }
  override destroyScene() {
    // remove resize listener so it stops calling layout()
    window.removeEventListener("resize", this.resizeHandler);
    super.destroyScene();
  }
}

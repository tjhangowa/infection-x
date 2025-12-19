import { Container, Sprite, Text, Assets, BlurFilter } from "pixi.js";
import { App } from "../core/app";
import { BaseScene } from "../scenes/BaseScene";
import { createTextButton, type TextButton } from "../ui/TextButton";
import { showInfoModal } from "../ui/InfoModal";
import { showSettingsModal } from "../ui/SettingsModal";
import { ModalManager } from "../ui/ModalManager";
import { SceneManager } from "../core/SceneManager";
import { WaitingLobbyScene } from "./WaitingLobbyScene";
import { AudioManager } from "../core/AudioManager";

export class MainMenuScene extends BaseScene {
  private background?: Sprite;
  private title?: Text;
  private titleBaseY: number = 24;
  private titleTicker?: () => void;

  private infoButton?: Container;
  private startButton?: Container;
  private settingsButton?: TextButton;

  private resizeHandler = () => this.layout();

  constructor() {
    super();
    this.sortableChildren = true;
  }

  async load() {
    await this.loadBackground();
    ModalManager.init(this);
    this.createTitle();
    this.createButtons();
    this.layout();

    // Load and play menu music
    const audioManager = AudioManager.getInstance();
    await audioManager.loadMenuMusic();
    audioManager.playMenuMusic();

    window.addEventListener("resize", this.resizeHandler);
  }

  private async loadBackground() {
    // Load video with looping enabled
    const texture = await Assets.load({
      src: "/assets/Maps/gamemenu.mp4",
      data: {
        loop: true,
        autoPlay: true,
        muted: true, // Mute by default for autoplay
        playsinline: true,
      },
    });
    
    this.background = new Sprite(texture);
    this.background.anchor.set(0);
    this.background.zIndex = 0;
    this.addChild(this.background);
  }

  private createTitle() {
    // Create title with pixelated effect (lower resolution)
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

      const blurFilter = new BlurFilter({ strength: 0, quality: 4 });

    this.addChild(this.title);

    let frameCounter = 0;
    const frameDuration = 10; // frames per position
    const floatAmount = 7; // pixels to float

    this.titleTicker = () => {
      frameCounter++;
      
      const frameIndex = Math.floor((frameCounter / frameDuration) % 3);

      let offsetY = 0;
      if (frameIndex === 0) {
        offsetY = -floatAmount; // Up
      } else if (frameIndex === 1) {
        offsetY = 0; // Middle
      } else {
        offsetY = floatAmount; // Down
      }

      if (this.title) {
        this.title.y = this.titleBaseY + offsetY;
      }

      // Glow effect - strongest on frame 1 (middle)
      if (this.title) {
        if (frameIndex === 1) {
          // Full glow on middle frame - yellow shine
          blurFilter.strength = 10;
          this.title.style.fill = "#FFD700"; // Yellow glow color (button hover color)
          this.title.style.dropShadow = {
            color: "#FFD700",
            alpha: 1,
            blur: 10,
            angle: 0,
            distance: 0,
          };
        } else if(frameIndex === 3) {
          blurFilter.strength = 10;
          this.title.style.fill = "#FFD700"; // Yellow glow color (button hover color)
          this.title.style.dropShadow = {
            color: "#FFD700",
            alpha: 1,
            blur: 10,
            angle: 0,
            distance: 0,
          };
        }else {
          // No glow on other frames
          blurFilter.strength = 0;
          this.title.style.fill = "#E1D3AE"; // Original color
          this.title.style.dropShadow = {
            color: "#000",
            alpha: 1,
            blur: 0,
            angle: Math.PI / 4,
            distance: 12,
          };
        }
      }
    };

    App.pixi.ticker.add(this.titleTicker);
  }

  private createButtons() {
    this.infoButton = createTextButton("INFO", () => showInfoModal());

    // ✅ UPDATED START BUTTON
    this.startButton = createTextButton("START", async () => {
      // Switch to Lobby. The Lobby scene handles the 'joinLobby' socket event automatically.
      await SceneManager.changeScene(new WaitingLobbyScene());
    }, 290, 110); // width, height (default: 260x90)
    (this.startButton as TextButton).setFontSize(70);


    this.settingsButton = createTextButton("SETTINGS", () =>
      showSettingsModal(),
    );
    // Make settings button text bigger
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
    this.titleBaseY = 24;
    this.title.y = this.titleBaseY;

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
    // Stop video playback when scene is destroyed
    if (this.background?.texture) {
      const resource = this.background.texture.source;
      // Check if it's a video resource and access the HTMLVideoElement
      if (resource && 'source' in resource && resource.source instanceof HTMLVideoElement) {
        resource.source.pause();
        resource.source.currentTime = 0;
      }
    }
    
    // Stop title animation
    if (this.titleTicker) {
      App.pixi.ticker.remove(this.titleTicker);
    }
    
    // Stop menu music when leaving main menu
    const audioManager = AudioManager.getInstance();
    audioManager.stopMenuMusic();
    
    // remove resize listener so it stops calling layout()
    window.removeEventListener("resize", this.resizeHandler);
    super.destroyScene();
  }
}

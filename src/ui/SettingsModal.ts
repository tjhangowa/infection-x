import {
  Container,
  Graphics,
  Text,
  Sprite,
  Assets,
  FederatedPointerEvent,
} from "pixi.js";
import { ModalManager } from "./ModalManager";
import { AudioSettings } from "./AudioSettings";
import { showKeybindsModal } from "./showKeybindsModal";

//const musicEnabled = true; // temporary local state (can be moved to global settings later)

export async function showSettingsModal() {
  ModalManager.clear();

  // Dark overlay
  const overlay = ModalManager.createOverlay();
  ModalManager.layer.addChild(overlay);

  // Panel container
  const panel = new Container();
  const panelW = 600;
  const panelH = 420;

  // Background
  const bg = new Graphics();
  bg.beginFill(0x121418, 0.94)
    .drawRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26)
    .endFill();

  bg.lineStyle(4, 0xffd700).drawRoundedRect(
    -panelW / 2,
    -panelH / 2,
    panelW,
    panelH,
    26,
  );

  panel.addChild(bg);

  // Heading
  const heading = new Text("SETTINGS", {
    fontFamily: "GameFont",
    fontSize: 54,
    fill: "#E1D3AE",
    letterSpacing: 4,
  });

  const margin = 28;
  heading.x = -140;
  heading.y = -panelH / 2 + margin;
  panel.addChild(heading);

  const volumeHeader = new Text("VOLUME", {
    fontFamily: "GameFont",
    fontSize: 42,
    fill: "#FFD700",
    letterSpacing: 3,
  });
  volumeHeader.x = -panelW / 2 + margin;
  volumeHeader.y = heading.y + 70;
  panel.addChild(volumeHeader);

  function createSlider(labelText: string, startValue: number, yPos: number) {
    const group = new Container();

    const label = new Text(labelText, {
      fontFamily: "GameFont",
      fontSize: 30,
      fill: "#C9C3AF",
      letterSpacing: 2,
    });
    label.x = -panelW / 2 + margin;
    label.y = yPos - 20;
    group.addChild(label);

    const percentLabel = new Text("0%", {
      fontFamily: "GameFont",
      fontSize: 28,
      fill: "#FFD700",
      letterSpacing: 1,
    });
    percentLabel.x = -panelW / 2 + margin + 140;
    percentLabel.y = yPos - 20;
    group.addChild(percentLabel);

    const slider = new Container();
    slider.x = panelW / 2 - 220;
    slider.y = yPos;
    slider.eventMode = "static";
    slider.cursor = "pointer";

    const barWidth = 300;
    const barHeight = 12;

    const bar = new Graphics();
    bar
      .beginFill(0x444444)
      .drawRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 6)
      .endFill();
    slider.addChild(bar);

    const knob = new Graphics();
    knob
      .beginFill(0xffd700)
      .lineStyle(2, 0xffffff)
      .drawCircle(0, 0, 14)
      .endFill();
    slider.addChild(knob);

    let draggingSlider = false;

    const updatePercent = () => {
      const percent = Math.round(((knob.x + 150) / 300) * 100);
      percentLabel.text = percent + "%";
      return percent;
    };

    const updateFromMouse = (event: FederatedPointerEvent) => {
      const pos = event.global;
      const local = slider.toLocal(pos);
      let x = local.x;
      x = Math.max(-150, Math.min(150, x));
      knob.x = x;
      updatePercent();
    };

    slider.on("pointerdown", (event) => {
      draggingSlider = true;
      updateFromMouse(event);
    });

    slider.on("pointermove", (event) => {
      if (!draggingSlider) return;
      updateFromMouse(event);
    });

    knob.on("pointerdown", () => {
      draggingSlider = true;
    });

    window.addEventListener("pointermove", (event) => {
      if (!draggingSlider) return;

      const rect = slider.getBounds();
      const sliderLeft = rect.x;
      const sliderWidth = rect.width;

      // Convert mouse screen X to slider-local X
      const mouseX = event.clientX - sliderLeft;
      const localX = mouseX - sliderWidth / 2;

      const x = Math.max(-150, Math.min(150, localX));
      knob.x = x;
      updatePercent();
    });

    window.addEventListener("pointerup", () => {
      draggingSlider = false;
    });

    setTimeout(() => {
      knob.x = startValue * 300 - 150;
      updatePercent();
    }, 0);

    group.addChild(slider);

    return {
      group,
      getValue: () => {
        return updatePercent();
      },
    };
  }

  const musicSlider = createSlider("Music", 0.5, volumeHeader.y + 180);
  const sfxSlider = createSlider("SFX", 0.5, volumeHeader.y + 280);
  const masterSlider = createSlider("Master", AudioSettings.master, volumeHeader.y + 80);

  const keybindsButton = new Text("Rebind Keys", {
  fontFamily: "GameFont",
  fontSize: 32,
  fill: "#FFD700",
  letterSpacing: 2,
  });
  keybindsButton.anchor.set(0.5);
  keybindsButton.x = 0;
  keybindsButton.y = panelH / 2 - 60;
  keybindsButton.eventMode = "static";
  keybindsButton.cursor = "pointer";

  keybindsButton.on("pointerdown", () => {
  showKeybindsModal();
});

panel.addChild(keybindsButton);

  panel.addChild(musicSlider.group);
  panel.addChild(sfxSlider.group);
  panel.addChild(masterSlider.group);

  const closeTexture = await Assets.load(
    "/assets/kenney_game-icons/PNG/White/1x/cross.png",
  );
  const closeIcon = new Sprite(closeTexture);
  closeIcon.anchor.set(0.5);
  closeIcon.width = 32;
  closeIcon.height = 32;
  closeIcon.x = panelW / 2 - margin;
  closeIcon.y = -panelH / 2 + margin;
  closeIcon.eventMode = "static";
  closeIcon.cursor = "pointer";
  closeIcon.on("pointerdown", () => {
    ModalManager.clear();
  });
  panel.addChild(closeIcon);

  // Center panel
  ModalManager.activeModal = panel;
  ModalManager.center(panel);
  ModalManager.layer.addChild(panel);

  AudioSettings.master = masterSlider.getValue() / 100;
  AudioSettings.music = musicSlider.getValue() / 100;
  AudioSettings.sfx = sfxSlider.getValue() / 100;
  AudioSettings.save();
  
}

import {
  Container,
  Graphics,
  Text,
  FederatedPointerEvent,
} from "pixi.js";
import { ModalManager } from "./ModalManager";
import { createTextButton } from "./TextButton";
import { AudioManager } from "../core/AudioManager";
import { App } from "../core/app";

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

  // Get AudioManager instance and current volume values
  const audioManager = AudioManager.getInstance();
  const masterSlider = createSlider("Master", audioManager.getMasterVolume() / 100, volumeHeader.y + 80);
  const musicSlider = createSlider("Music", audioManager.getMusicVolume() / 100, volumeHeader.y + 180);
  const sfxSlider = createSlider("SFX", audioManager.getSfxVolume() / 100, volumeHeader.y + 280);

  panel.addChild(musicSlider.group);
  panel.addChild(sfxSlider.group);
  panel.addChild(masterSlider.group);

  // Update volumes when sliders change
  const volumeTicker = () => {
    audioManager.setMasterVolume(masterSlider.getValue());
    audioManager.setMusicVolume(musicSlider.getValue());
    audioManager.setSfxVolume(sfxSlider.getValue());
  };

  App.pixi.ticker.add(volumeTicker);

  // Clean up ticker when modal closes
  const closeWithCleanup = () => {
    App.pixi.ticker.remove(volumeTicker);
    ModalManager.clear();
  };

  const closeBtn = createTextButton('CLOSE', closeWithCleanup, 160, 70);
  closeBtn.x = panelW/2 - margin - -40;
  closeBtn.y = -panelH/2 + margin + 25;
  panel.addChild(closeBtn);

  overlay.on('pointerdown', closeWithCleanup);


  // Center panel
  ModalManager.activeModal = panel;
  ModalManager.center(panel);
  ModalManager.layer.addChild(panel);
}

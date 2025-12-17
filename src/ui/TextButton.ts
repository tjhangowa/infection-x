import { Container, Graphics, Text, BlurFilter } from "pixi.js";
import { App } from "../core/app";
import type { DestroyOptions } from "pixi.js";

export interface TextButton extends Container {
  labelText: Text;
  setLabel: (text: string) => void;
  setFontSize: (size: number) => void;
}

export function createTextButton(
  label: string,
  onClick: () => void,
  width = 260,
  height = 90,
): TextButton {
  const root = new Container() as TextButton;
  root.eventMode = "static";
  root.cursor = "pointer";

  // --- Graphics layers ---
  const bg = new Graphics();
  const glow = new Graphics();
  glow.filters = [new BlurFilter({ strength: 20, quality: 5 })];
  glow.alpha = 0;
  glow.blendMode = "add";

  // --- Text + shadow ---
  const shadow = new Text(label, {
    fontFamily: "GameFont",
    fontSize: 40,
    fill: "#000000",
    letterSpacing: 2,
  });
  shadow.anchor.set(0.5);
  shadow.x = 1;
  shadow.y = 1;

  const txt = new Text(label, {
    fontFamily: "GameFont",
    fontSize: 40,
    fill: "#E1D3AE",
    letterSpacing: 2,
    dropShadow: {
      color: "#000000ff",
      alpha: 0.8,
      blur: 0,
      angle: Math.PI / 4,
      distance: 6,
    },
  });
  txt.anchor.set(0.5);

  // Hover state
  const state = { hover: false, t: 0 };

  function draw() {
    const p = state.t;

    bg.clear();
    glow.clear();

    const baseColor = 0x314b1b;
    const borderColor = 0xffd700;
    const radius = 12;

    // main fill
    bg.beginFill(baseColor);
    bg.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    bg.endFill();

    // border on hover
    if (p > 0.001) {
      bg.lineStyle(5 + 2 * p, borderColor, p);
      bg.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    }

    // glow
    if (p > 0) {
      const exp = 14 + 20 * p;
      glow.beginFill(0x111111, 0.25 * p);
      glow.drawRoundedRect(
        -width / 2 - exp / 2,
        -height / 2 - exp / 2,
        width + exp,
        height + exp,
        radius + 6,
      );
      glow.endFill();
    }

    shadow.alpha = 0.4 + 0.4 * p;
    txt.scale.set(1 + 0.02 * p);
  }

  // Add children
  root.addChild(glow, bg, shadow, txt);

  // Interaction
  root.on("pointerover", () => (state.hover = true));
  root.on("pointerout", () => (state.hover = false));
  root.on("pointerdown", onClick);

  // Animation tick
  const tickerFn = () => {
    const target = state.hover ? 1 : 0;
    state.t += (target - state.t) * 0.18;
    if (Math.abs(target - state.t) < 0.001) state.t = target;
    draw();
  };

  App.pixi.ticker.add(tickerFn);

  // Ensure ticker stops when scene changes
  const originalDestroy = root.destroy.bind(root);

  root.destroy = (options?: boolean | DestroyOptions) => {
    App.pixi.ticker.remove(tickerFn);
    originalDestroy(options);
  };
  // Helpers
  root.labelText = txt;
  root.setLabel = (text: string) => {
    txt.text = text;
    shadow.text = text;
  };
  root.setFontSize = (size: number) => {
    txt.style.fontSize = size;
    shadow.style.fontSize = size;
  };

  return root;
}

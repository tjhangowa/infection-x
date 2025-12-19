import { Container, Graphics, Text, FederatedPointerEvent } from "pixi.js";
import { ModalManager } from "./ModalManager";
import { getKeysFor, addKeyFor, removeKeyFor, Action } from "./Keybinds";

export function showKeybindsModal() {
  ModalManager.clear();

  const overlay = ModalManager.createOverlay();
  ModalManager.layer.addChild(overlay);

  const panel = new Container();
  const panelW = 600;
  const panelH = 500;

  const bg = new Graphics();
  bg.beginFill(0x121418, 0.94)
    .drawRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 26)
    .endFill();
  bg.lineStyle(4, 0xffd700).drawRoundedRect(
    -panelW / 2,
    -panelH / 2,
    panelW,
    panelH,
    26
  );
  panel.addChild(bg);

  const heading = new Text("KEYBINDS", {
    fontFamily: "GameFont",
    fontSize: 48,
    fill: "#E1D3AE",
    letterSpacing: 4,
  });
  heading.x = -120;
  heading.y = -panelH / 2 + 30;
  panel.addChild(heading);

  const actions: Action[] = [
    "moveLeft",
    "moveRight",
    "jump",
    "infect",
    "parry",
  ];

  let listeningFor: Action | null = null;

  function createRow(action: Action, y: number) {
    const row = new Container();

    const label = new Text(action.toUpperCase(), {
      fontFamily: "GameFont",
      fontSize: 28,
      fill: "#FFD700",
    });
    label.x = -panelW / 2 + 40;
    label.y = y;
    row.addChild(label);

    const keysText = new Text(getKeysFor(action).join(", "), {
      fontFamily: "GameFont",
      fontSize: 26,
      fill: "#C9C3AF",
    });
    keysText.x = 80;
    keysText.y = y;
    row.addChild(keysText);

    const button = new Text("[ Add Key ]", {
      fontFamily: "GameFont",
      fontSize: 26,
      fill: "#FFFFFF",
    });
    button.x = panelW / 2 - 180;
    button.y = y;
    button.eventMode = "static";
    button.cursor = "pointer";

    button.on("pointerdown", () => {
      listeningFor = action;
      keysText.text = "Press a key...";
    });

    row.addChild(button);

    return { row, keysText };
  }

  const rows = actions.map((a, i) =>
    createRow(a, -panelH / 2 + 120 + i * 60)
  );

  rows.forEach(r => panel.addChild(r.row));

  // Listen for key presses
  window.addEventListener("keydown", function handler(e) {
    if (!listeningFor) return;

    const key = e.key.toLowerCase();
    addKeyFor(listeningFor, key);

    const row = rows.find(r => r.keysText.text.includes(listeningFor!.toUpperCase()));
    rows.forEach((r, i) => {
      r.keysText.text = getKeysFor(actions[i]).join(", ");
    });

    listeningFor = null;
  });

  // Close button
  const close = new Text("[ Close ]", {
    fontFamily: "GameFont",
    fontSize: 32,
    fill: "#FFD700",
  });
  close.anchor.set(0.5);
  close.x = 0;
  close.y = panelH / 2 - 50;
  close.eventMode = "static";
  close.cursor = "pointer";
  close.on("pointerdown", () => ModalManager.clear());
  panel.addChild(close);

  ModalManager.activeModal = panel;
  ModalManager.center(panel);
  ModalManager.layer.addChild(panel);
}
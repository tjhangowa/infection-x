import { Container, Graphics, Assets, Sprite, Text } from "pixi.js";
import { ModalManager } from "./ModalManager";

export async function showInfoModal() {
  ModalManager.clear();

  // Dark overlay
  const overlay = ModalManager.createOverlay();
  ModalManager.layer.addChild(overlay);

  // Modal panel container
  const panel = new Container();
  const panelW = 1000;
  const panelH = 520;

  // Background box
  const bg = new Graphics();
  bg.beginFill(0x101010, 0.92)
    .drawRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 30)
    .endFill();

  bg.lineStyle(4, 0xffd700).drawRoundedRect(
    -panelW / 2,
    -panelH / 2,
    panelW,
    panelH,
    30,
  );

  panel.addChild(bg);

  // Heading
  const heading = new Text("HOW TO PLAY", {
    fontFamily: "GameFont",
    fontSize: 58,
    fill: 0xffd700,
    letterSpacing: 4,
  });

  heading.x = -panelW / 2 + 32;
  heading.y = -panelH / 2 + 32;
  panel.addChild(heading);

  // Scrollable body container
  const margin = 32;
  const contentHeight = panelH - margin * 2 - 120;

  const bodyContainer = new Container();
  bodyContainer.x = -panelW / 2 + margin;
  bodyContainer.y = heading.y + 90;

  const body = new Text(
    "Infection spreads rapidly – survive as long as you can!\n\n" +
      "• Move: WASD or Arrow Keys\n" +
      "• Avoid: Infected zones / enemies\n" +
      "• Collect: Antidotes / supply drops\n" +
      "• Buff Zones: Risk–reward power areas\n" +
      "• Health Stations cleanse infection\n" +
      "• Craft upgrades with materials\n\n" +
      "Goal: Stay uninfected and survive until time runs out.",
    {
      fontFamily: "GameFont",
      fontSize: 30,
      fill: "#C9C3AF",
      letterSpacing: 1,
      wordWrap: true,
      wordWrapWidth: panelW - margin * 2 - 16,
      breakWords: true,
    },
  );

  bodyContainer.addChild(body);
  panel.addChild(bodyContainer);

  // Mask for scrollable area
  const mask = new Graphics()
    .beginFill(0xffffff)
    .drawRect(
      -panelW / 2 + margin,
      bodyContainer.y,
      panelW - margin * 2,
      contentHeight,
    )
    .endFill();

  panel.addChild(mask);
  bodyContainer.mask = mask;

  // Scrolling logic
  if (body.height > contentHeight) {
    bodyContainer.eventMode = "static";

    bodyContainer.on("wheel", (e: WheelEvent) => {
      const delta = e.deltaY > 0 ? -30 : 30;
      const minY = heading.y + 90 - (body.height - contentHeight);
      const maxY = heading.y + 90;

      bodyContainer.y = Math.max(minY, Math.min(maxY, bodyContainer.y + delta));
    });
  }

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

  // Center modal
  ModalManager.activeModal = panel;
  ModalManager.center(panel);
  ModalManager.layer.addChild(panel);
}

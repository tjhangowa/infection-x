import { Container, Graphics, Text } from "pixi.js";
import { ModalManager } from "./ModalManager";
import { createTextButton } from "./TextButton";

export async function showInfoModal() {
  ModalManager.clear();

  // Dark overlay
  const overlay = ModalManager.createOverlay();
  ModalManager.layer.addChild(overlay);

  const panelW = 1000;
  const panelH = 520;
  const panel = new Container();
  const panelBG = new Graphics();
  panelBG.beginFill(0x101010, 0.92).drawRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 30).endFill();
  panelBG.lineStyle(4, 0xFFD700, 1).drawRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 30);
  panel.addChild(panelBG);

  const margin = 32;
  const heading = new Text('HOW TO PLAY', {
      fontFamily: 'GameFont',
      fontSize: 58,
      fill: 0xFFD700,
      letterSpacing: 4,
  });
  heading.anchor.set(0, 0);
  heading.x = -panelW/2 + margin;
  heading.y = -panelH/2 + margin;
  panel.addChild(heading);

  const contentAreaHeight = panelH - margin*2 - 120;
  const bodyContainer = new Container();
  bodyContainer.x = -panelW/2 + margin;
  bodyContainer.y = heading.y + 90;
  panel.addChild(bodyContainer);

  const body = new Text(
      'SURVIVE OR INFECT!\n\n' +
      '• Controls: WASD or Arrow Keys\n' +
      '• Avoid: Infected Players\n' +
      '• Collect: Power-ups and Items around the map to turn the tide of the game\n\n' +
      'Goal:\n\n' +
      '• SURVIVORS: SURVIVE FOR 5 MINUTES AND DONT GET INFECTED\n' +
      '• INFECTED: INFECT ALL SURVIVORS BEFORE TIME RUNS OUT',
      {
          fontFamily: 'GameFont',
          fontSize: 30,
          fill: '#C9C3AF',
          letterSpacing: 1,
          align: 'left',
          wordWrap: true,
          wordWrapWidth: panelW - margin*2 - 16,
          breakWords: true,
      }
  );
  body.anchor.set(0, 0);
  bodyContainer.addChild(body);

  const maskG = new Graphics()
      .beginFill(0xffffff)
      .drawRect(-panelW/2 + margin, bodyContainer.y, panelW - margin*2, contentAreaHeight)
      .endFill();
  panel.addChild(maskG);
  bodyContainer.mask = maskG;

  if (body.height > contentAreaHeight) {
      bodyContainer.eventMode = 'static';
      bodyContainer.on('wheel', (e: any) => {
          const delta = e.deltaY > 0 ? -30 : 30;
          bodyContainer.y = Math.min(heading.y + 90, Math.max(heading.y + 90 - (body.height - contentAreaHeight), bodyContainer.y + delta));
      });
  }

  const closeBtn = createTextButton('CLOSE', () => {
    ModalManager.clear();
  }, 160, 70);
  closeBtn.x = panelW/2 - margin - 80;
  closeBtn.y = -panelH/2 + margin + 35;
  panel.addChild(closeBtn);

  // Center panel
  ModalManager.activeModal = panel;
  ModalManager.center(panel);
  ModalManager.layer.addChild(panel);
}
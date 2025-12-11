import { Application, Container, Graphics, Text } from 'pixi.js';
import { createTextButton, TextButton } from '../components/button';
import { createVolumeSlider, VolumeSlider } from '../components/volumeSlider';
import { AudioManager } from '../../audio/audioManager';

export function showSettingsModal(
    app: Application,
    modalLayer: Container,
    clearModal: () => void,
    createTextButtonFn: (app: Application, label: string, width: number, height: number, onClick: () => void) => TextButton,
    audioManager: AudioManager,
    centerPanel: (panel: Container) => void
): void {
    clearModal();
    const overlay = new Graphics();
    overlay.beginFill(0x000000, 0.85).drawRect(0, 0, app.renderer.width, app.renderer.height).endFill();
    overlay.eventMode = 'static';
    modalLayer.addChild(overlay);

    const panelW = 700;
    const panelH = 500;
    const panel = new Container();
    const panelBG = new Graphics();
    panelBG.beginFill(0x121418, 0.94).drawRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 26).endFill();
    panelBG.lineStyle(4, 0xFFD700, 1).drawRoundedRect(-panelW/2, -panelH/2, panelW, panelH, 26);
    panel.addChild(panelBG);

    const heading = new Text('SETTINGS', {
        fontFamily: 'GameFont',
        fontSize: 54,
        fill: '#E1D3AE',
        letterSpacing: 4,
    });
    heading.anchor.set(0, 0);
    const margin = 28;
    heading.x = -panelW/2 + margin;
    heading.y = -panelH/2 + margin;
    panel.addChild(heading);

    const sliderWidth = panelW - margin * 2;
    const sliderHeight = 80;
    const sliderSpacing = 100;

    const mainSlider = createVolumeSlider(app, 'MAIN VOLUME', sliderWidth, sliderHeight, audioManager.getMainVolume());
    mainSlider.x = -panelW/2 + margin;
    mainSlider.y = heading.y + 80;
    panel.addChild(mainSlider);

    const sfxSlider = createVolumeSlider(app, 'SFX VOLUME', sliderWidth, sliderHeight, audioManager.getSfxVolume());
    sfxSlider.x = -panelW/2 + margin;
    sfxSlider.y = mainSlider.y + sliderSpacing;
    panel.addChild(sfxSlider);

    const musicSlider = createVolumeSlider(app, 'MUSIC VOLUME', sliderWidth, sliderHeight, audioManager.getMusicVolume());
    musicSlider.x = -panelW/2 + margin;
    musicSlider.y = sfxSlider.y + sliderSpacing;
    panel.addChild(musicSlider);

    let volumeTicker: (() => void) | null = null;
    const tickerFn = () => {
        audioManager.setMainVolume(mainSlider.getValue());
        audioManager.setSfxVolume(sfxSlider.getValue());
        audioManager.setMusicVolume(musicSlider.getValue());
    };
    volumeTicker = tickerFn;
    app.ticker.add(volumeTicker);

    const closeWithCleanup = () => {
        if (volumeTicker) {
            app.ticker.remove(volumeTicker);
        }
        clearModal();
    };

    overlay.on('pointerdown', closeWithCleanup);
    panel.eventMode = 'static';
    panel.on('pointerdown', (e) => {
        e.stopPropagation();
    });

    const closeBtn = createTextButtonFn(app, 'CLOSE', 160, 70, closeWithCleanup);
    closeBtn.x = panelW/2 - margin - 80;
    closeBtn.y = -panelH/2 + margin + 35;
    panel.addChild(closeBtn);

    centerPanel(panel);
    modalLayer.addChild(panel);
}


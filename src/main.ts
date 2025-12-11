import { Application, Container, Graphics } from 'pixi.js';
import { ASSET_NAMES } from './config/assets';
import { AudioManager } from './audio/audioManager';
import { BackgroundManager } from './background/backgroundManager';
import { createTextButton } from './ui/components/button';
import { createTitle } from './ui/components/title';
import { showInfoModal } from './ui/modals/infoModal';
import { showSettingsModal } from './ui/modals/settingsModal';

async function main() {
    const app = new Application();
    await app.init({ width: window.innerWidth, height: window.innerHeight, antialias: true });

    const container = document.getElementById('pixi-container');
    (container ?? document.body).appendChild(app.canvas);

    try {
        // Load font
        const fontFace = new FontFace('GameFont', `url(${ASSET_NAMES.font})`);
        await fontFace.load();
        (document as any).fonts.add(fontFace);

        // Initialize audio manager
        const audioManager = new AudioManager();
        audioManager.initializeInteractionListeners();

        // Load background
        const backgroundManager = new BackgroundManager(app);
        await backgroundManager.load();

        // Create title
        const title = createTitle(app);

        // Create UI layers
        const uiLayer = new Container();
        uiLayer.zIndex = 20;
        app.stage.addChild(uiLayer);
        app.stage.sortableChildren = true;

        const modalLayer = new Container();
        modalLayer.zIndex = 50;
        app.stage.addChild(modalLayer);

        function clearModal() {
            modalLayer.removeChildren();
        }

        function centerPanel(panel: Container) {
            panel.x = app.renderer.width / 2;
            panel.y = app.renderer.height / 2;
        }

        // Create buttons
        const infoPureButton = createTextButton(app, 'INFO', 240, 90, () => {
            showInfoModal(app, modalLayer, clearModal, createTextButton, centerPanel);
        });
        uiLayer.addChild(infoPureButton);

        const startPureButton = createTextButton(app, 'START', 300, 110, () => {
            // eslint-disable-next-line no-console
            console.log('Start button clicked (pure)');
        });
        startPureButton.setFontSize(80);
        uiLayer.addChild(startPureButton);

        const creditsPureButton = createTextButton(app, 'SETTINGS', 240, 90, () => {
            showSettingsModal(app, modalLayer, clearModal, createTextButton, audioManager, centerPanel);
        });
        creditsPureButton.setFontSize(40);
        uiLayer.addChild(creditsPureButton);

        const layoutButtons = () => {
            const w = app.renderer.width;
            const h = app.renderer.height;
            const centerX = w / 2;
            const baseY = h * .85;
            const gap = 300;
            startPureButton.x = centerX;
            startPureButton.y = baseY;
            infoPureButton.x = centerX - gap;
            infoPureButton.y = baseY;
            creditsPureButton.x = centerX + gap;
            creditsPureButton.y = baseY;
        };

        const resize = () => {
            app.renderer.resize(window.innerWidth, window.innerHeight);

            const w = app.renderer.width;

            // Resize background
            backgroundManager.resize();

            // Center title horizontally
            title.x = (w - title.width) / 2;

            // Layout buttons
            layoutButtons();

            // Recenter modals & resize overlay
            if (modalLayer.children.length > 0) {
                modalLayer.children.forEach((c, idx) => {
                    if (c instanceof Graphics && idx === 0) {
                        (c as Graphics).clear().beginFill(0x000000, 0.85).drawRect(0, 0, app.renderer.width, app.renderer.height).endFill();
                    } else if (c instanceof Container) {
                        centerPanel(c as Container);
                    }
                });
            }
        };

        resize();
        window.addEventListener('resize', resize);
    } catch (error) {
        console.error('Error loading assets:', error);
    }
}

main();

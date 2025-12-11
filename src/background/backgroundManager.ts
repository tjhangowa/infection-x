import { Application, Sprite, Texture } from 'pixi.js';
import { ASSET_NAMES } from '../config/assets';

export class BackgroundManager {
    private app: Application;
    private video: HTMLVideoElement;
    private background: Sprite;
    private texture: Texture;

    constructor(app: Application) {
        this.app = app;
    }

    public async load(): Promise<void> {
        // Create video element for background
        this.video = document.createElement('video');
        this.video.src = ASSET_NAMES.startbackground;
        this.video.loop = true;
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = true;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
            this.video.onloadedmetadata = () => {
                this.video.play().then(() => {
                    resolve();
                }).catch(reject);
            };
            this.video.onerror = reject;
        });

        // Create texture from video element
        this.texture = Texture.from(this.video);

        this.background = new Sprite(this.texture);
        this.background.anchor.set(0);
        this.background.zIndex = 0;
        this.app.stage.addChild(this.background);
    }

    public resize(): void {
        const w = this.app.renderer.width;
        const h = this.app.renderer.height;
        const videoWidth = this.video.videoWidth || this.texture.width;
        const videoHeight = this.video.videoHeight || this.texture.height;
        const scale = Math.max(w / videoWidth, h / videoHeight);
        this.background.scale.set(scale);
        this.background.x = (w - this.background.width) * 0;
        this.background.y = (h - this.background.height) * 0;
    }

    public getBackground(): Sprite {
        return this.background;
    }
}


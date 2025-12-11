import { ASSET_NAMES } from '../config/assets';

export class AudioManager {
    private menuMusic: HTMLAudioElement;
    private mainVolume: number = 100;
    private sfxVolume: number = 100;
    private musicVolume: number = 100;
    private musicStarted: boolean = false;

    constructor() {
        this.menuMusic = new Audio(ASSET_NAMES.menuMusic);
        this.menuMusic.loop = true;
        this.menuMusic.volume = 1.0;
        this.startMusic();
    }

    private async startMusic() {
        if (!this.musicStarted) {
            try {
                await this.menuMusic.play();
                this.musicStarted = true;
            } catch (err) {
                console.log('Audio autoplay blocked, waiting for user interaction');
            }
        }
    }

    public initializeInteractionListeners() {
        const startMusicOnInteraction = () => {
            this.startMusic();
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
        };
        document.addEventListener('click', startMusicOnInteraction, { once: true });
        document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
    }

    public updateMenuMusicVolume() {
        const finalVolume = (this.mainVolume / 100) * (this.musicVolume / 100);
        this.menuMusic.volume = Math.max(0, Math.min(1, finalVolume));
    }

    public setMainVolume(volume: number) {
        this.mainVolume = volume;
        this.updateMenuMusicVolume();
    }

    public setMusicVolume(volume: number) {
        this.musicVolume = volume;
        this.updateMenuMusicVolume();
    }

    public setSfxVolume(volume: number) {
        this.sfxVolume = volume;
    }

    public getMainVolume(): number {
        return this.mainVolume;
    }

    public getMusicVolume(): number {
        return this.musicVolume;
    }

    public getSfxVolume(): number {
        return this.sfxVolume;
    }
}


export class AudioManager {
  private static instance: AudioManager;
  private menuMusic?: HTMLAudioElement;
  
  private masterVolume: number = 0.5; // 0-1
  private musicVolume: number = 0.5; // 0-1
  private sfxVolume: number = 0.5; // 0-1

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async loadMenuMusic(): Promise<void> {
    if (this.menuMusic) {
      return; // Already loaded
    }

    this.menuMusic = new Audio("/assets/music/menu.mp3");
    this.menuMusic.loop = true;
    this.menuMusic.volume = this.getEffectiveMusicVolume();
    
    // Try to play (may fail due to autoplay restrictions)
    try {
      await this.menuMusic.play();
    } catch (e) {
      console.log("Menu music autoplay blocked, will play on user interaction");
    }
  }

  playMenuMusic(): void {
    if (this.menuMusic) {
      this.menuMusic.play().catch((e) => {
        console.warn("Failed to play menu music:", e);
      });
    }
  }

  stopMenuMusic(): void {
    if (this.menuMusic) {
      this.menuMusic.pause();
      this.menuMusic.currentTime = 0;
    }
  }

  private getEffectiveMusicVolume(): number {
    // Master volume multiplies music volume
    return this.musicVolume * this.masterVolume;
  }

  setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value / 100));
    this.updateMusicVolume();
  }

  setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value / 100));
    this.updateMusicVolume();
  }

  setSfxVolume(value: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, value / 100));
  }

  private updateMusicVolume(): void {
    if (this.menuMusic) {
      this.menuMusic.volume = this.getEffectiveMusicVolume();
    }
  }

  getMasterVolume(): number {
    return this.masterVolume * 100;
  }

  getMusicVolume(): number {
    return this.musicVolume * 100;
  }

  getSfxVolume(): number {
    return this.sfxVolume * 100;
  }
}

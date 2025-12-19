import { Application } from "pixi.js";

export class App {
  static pixi: Application;

  static async init() {
    App.pixi = new Application();

    await App.pixi.init({
      resizeTo: window,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      antialias: true,
      backgroundAlpha: 1,
    });

    const container = document.getElementById("pixi-container");
    (container ?? document.body).appendChild(App.pixi.canvas);

    App.pixi.stage.sortableChildren = true;

    // Load default font globally
    await App.loadFont();
  }

  private static async loadFont() {
    // Check if font is already loaded to prevent errors on replay
    if (document.fonts.check("10px GameFont")) {
      console.log("Font 'GameFont' already loaded");
      return; // Font already exists, skip loading
    }

    try {
      console.log("Loading font from /assets/upheavtt.ttf");
      const fontFace = new FontFace('GameFont', 'url(/assets/upheavtt.ttf)');
      await fontFace.load();
      document.fonts.add(fontFace);
      
      // Verify the font is loaded
      await document.fonts.ready;
      const isLoaded = document.fonts.check("10px GameFont");
      if (isLoaded) {
        console.log("✅ Font 'GameFont' successfully loaded");
      } else {
        console.warn("⚠️ Font 'GameFont' may not be properly loaded");
      }
    } catch (e) {
      console.error("❌ Font loading failed:", e);
      // Try fallback path
      try {
        console.log("Trying alternative path: assets/upheavtt.ttf");
        const fontFace = new FontFace('GameFont', 'url(assets/upheavtt.ttf)');
        await fontFace.load();
        document.fonts.add(fontFace);
        console.log("✅ Font loaded with alternative path");
      } catch (e2) {
        console.error("❌ Alternative font path also failed:", e2);
      }
    }
  }
}

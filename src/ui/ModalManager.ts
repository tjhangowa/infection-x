import { Container, Graphics } from "pixi.js";
import { App } from "../core/app";

/**
 * Optional interface for modals that expose a layout() method.
 * This avoids using `any` casts.
 */
type LayoutableContainer = Container & {
  layout?: () => void;
};

export class ModalManager {
  static layer: Container;
  static activeModal: Container | null = null;

  /**
   * Called once by a scene (ex: MainMenuScene.load())
   */
  static init(parent: Container) {
    ModalManager.layer = new Container();
    ModalManager.layer.zIndex = 999; // always on top
    parent.addChild(ModalManager.layer);
  }

  /**
   * Attach a resize listener to keep overlays and modals centered.
   * Safe to call once.
   */
  static watchResize() {
    window.addEventListener("resize", () => {
      if (!ModalManager.layer) return;

      // Resize overlays
      for (const child of ModalManager.layer.children) {
        if (child instanceof Graphics) {
          child.clear();
          child
            .beginFill(0x000000, 0.85)
            .drawRect(0, 0, App.pixi.renderer.width, App.pixi.renderer.height)
            .endFill();
        }
      }

      // Re-center active modal
      const modal = ModalManager.activeModal as LayoutableContainer | null;
      if (modal) {
        ModalManager.center(modal);
        modal.layout?.();
      }
    });
  }

  /**
   * Remove any active modal and overlay.
   */
  static clear() {
    if (ModalManager.layer) {
      ModalManager.layer.removeChildren();
    }
    ModalManager.activeModal = null;
  }

  /**
   * Center a modal container on screen.
   */
  static center(container: Container) {
    const { width, height } = App.pixi.renderer;
    container.x = width / 2;
    container.y = height / 2;
  }

  /**
   * Create a dark overlay behind a modal.
   */
  static createOverlay(alpha = 0.85): Graphics {
    const overlay = new Graphics();

    overlay
      .beginFill(0x000000, alpha)
      .drawRect(0, 0, App.pixi.renderer.width, App.pixi.renderer.height)
      .endFill();

    overlay.eventMode = "static"; // block clicks behind modal
    return overlay;
  }
}

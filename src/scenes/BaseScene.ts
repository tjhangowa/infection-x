import { Container } from "pixi.js";

/**
 * BaseScene allows all scenes to share behavior:
 * - async load()
 * - destroy()
 * - lifecycle consistency
 */
export class BaseScene extends Container {
  constructor() {
    super();
    this.sortableChildren = true;
  }

  /** Override in child scenes if needed */
  async load(): Promise<void> {}

  /** Cleanup logic if scenes need it later */
  destroyScene() {
    this.destroy({ children: true });
  }
}

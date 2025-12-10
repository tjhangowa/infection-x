type Action = "moveLeft" | "moveRight" | "jump";

export class InputManager {
  private keys: Record<string, boolean> = {};

  private bindings: Record<Action, string[]> = {
    moveLeft: ["ArrowLeft", "KeyA"],
    moveRight: ["ArrowRight", "KeyD"],
    jump: ["Space", "KeyW"],
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  isDown(action: Action): boolean {
    return this.bindings[action].some(code => !!this.keys[code]);
  }

  rebind(action: Action, newKeys: string[]) {
    this.bindings[action] = newKeys;
  }
}
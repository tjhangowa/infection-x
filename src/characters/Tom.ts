import { Assets, Spritesheet } from "pixi.js";
import { BaseCharacter } from "./BaseCharacter";

export class Tom extends BaseCharacter {
  private static _sheet: Spritesheet;

  static async loadAssets() {
    if (Tom._sheet) return;
    Tom._sheet = await Assets.load<Spritesheet>(
      "assets/characters/tomfinalized/tom.json",
    );
  }

  protected get sheet(): Spritesheet {
    return Tom._sheet;
  }

  constructor() {
    super("idle_east");
  }
}

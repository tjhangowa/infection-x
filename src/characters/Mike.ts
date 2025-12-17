import { Assets, Spritesheet } from "pixi.js";
import { BaseCharacter } from "./BaseCharacter";

export class Mike extends BaseCharacter {
  private static _sheet: Spritesheet;

  static async loadAssets() {
    if (Mike._sheet) return;
    Mike._sheet = await Assets.load<Spritesheet>(
      "assets/characters/mikefinalized/mike.json",
    );
  }

  protected get sheet(): Spritesheet {
    return Mike._sheet;
  }

  constructor() {
    super("idle_east");
  }
}

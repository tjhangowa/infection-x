import { Assets, Spritesheet } from "pixi.js";
import { BaseCharacter } from "./BaseCharacter";

export class Jenny extends BaseCharacter {
  private static _sheet: Spritesheet;

  static async loadAssets() {
    if (Jenny._sheet) return;
    Jenny._sheet = await Assets.load<Spritesheet>(
      "assets/characters/jennyfinalized/jenny.json",
    );
  }

  protected get sheet(): Spritesheet {
    return Jenny._sheet;
  }

  constructor() {
    super("idle_east");
  }
}

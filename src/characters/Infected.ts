import { Assets, Spritesheet } from "pixi.js";
import { BaseCharacter } from "./BaseCharacter";

export class Infected extends BaseCharacter {
  private static _sheet: Spritesheet;

  static async loadAssets() {
    if (Infected._sheet) return;
    // Make sure you have this path correct in your public folder
    Infected._sheet = await Assets.load<Spritesheet>(
      "assets/characters/infectedfinalized/infected.json",
    );
  }

  protected get sheet(): Spritesheet {
    return Infected._sheet;
  }

  constructor() {
    super("idle_east");
  }
}

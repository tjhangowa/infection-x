import * as PIXI from "pixi.js";
import { Terrain } from "./terrain";

export class Ground extends Terrain {
  constructor(
    texture: PIXI.Texture,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    super(texture, x, y, width, height);
    this.tag = "ground";
  }
}

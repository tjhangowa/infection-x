import * as PIXI from "pixi.js"
import { Bodies, Body } from 'matter-js'

export abstract class Terrain extends PIXI.Container {
    sprite: PIXI.Sprite;
    body: Body;
    
    constructor(texture: PIXI.Texture, x: number, y: number, width: number, height: number) {

        super();
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.anchor.set(0.5);
        this.sprite.width = width;
        this.sprite.height = height;
        this.sprite.position.set(0,0);
        this.addChild(this.sprite);

        const terrainOptions: Matter.IChamferableBodyDefinition = {
            isStatic: true
        }
    
         this.body = Bodies.rectangle(x, y, width, height, terrainOptions);
         this.position.set(x,y);
    }

    update() {
        this.position.set(this.body.position.x, this.body.position.y);
        this.rotation = this.body.angle;
    }
}
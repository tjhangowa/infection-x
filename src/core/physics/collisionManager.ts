import Matter, { Engine, Events } from "matter-js";
import { Player } from "./playerDemoActor";
import { direction } from "./sharedTypes";
import { Ground } from "../../objects/terrain/ground";
import { Wall } from "../../objects/terrain/wall";

export class collisionManger {
    private bodyToClass = new Map<Matter.Body, any>();

    players: Player[] = []

    private engine: Engine;

    constructor(engine : Engine) {
        this.engine = engine;
        Events.on(this.engine, "collisionActive", this.handleCollisions.bind(this));
        Events.on(this.engine, "collisionEnd", this.handleCollisionEnd.bind(this));
    }

    registerObject(obj: {body: Matter.Body}) {
        this.bodyToClass.set(obj.body, obj);
        if (obj instanceof Player) {
            this.players.push(obj);
        }
    }

    handleCollisions (event: Matter.IEventCollision<Matter.Engine>) {
        for (const player of this.players) {
            player.isGrounded = false;
            player.isTouchingWall = false;
            player.wallDirection = direction.None;
        }

        for (const pair of event.pairs) {
            const a = this.bodyToClass.get(pair.bodyA);
            const b = this.bodyToClass.get(pair.bodyB);

            if (a instanceof Player || b instanceof Player) {
                const player = a instanceof Player ? a : b as Player;
                const other = a instanceof Player ? b : a;
                const normal = pair.collision.normal;

                if (other instanceof Ground && normal.y < -0.5) {
                    player.isGrounded = true;
                }

                if (other instanceof Wall && Math.abs(normal.x) > 0.5) {
                    player.isTouchingWall = true;
                    player.wallDirection = normal.x > 0 ? direction.Left : direction.Right;
                }
            }
        }
    }

    handleCollisionEnd (event: Matter.IEventCollision<Matter.Engine>) {
        for (const pair of event.pairs) {
            const a = this.bodyToClass.get(pair.bodyA);
            const b = this.bodyToClass.get(pair.bodyB);

            if (a instanceof Player || b instanceof Player) {
                const player = a instanceof Player ? a : b as Player;

                player.isGrounded = false;
                player.isTouchingWall = false;
                player.wallDirection = direction.None;
            }
        }
    }
}
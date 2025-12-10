import { Player } from "./playerDemoActor";
import { InputManager } from "./inputManager";
import { direction } from "./sharedTypes";

export class localController {
    private player: Player;
    private input: InputManager;

    constructor(player: Player, input: InputManager) {
        this.player = player;
        this.input = input;
    }

    update() {
        const leftDown = this.input.isDown("moveLeft");
        const rightDown = this.input.isDown("moveRight");
        const jumpDown = this.input.isDown("jump");

        let inputDirection: direction = direction.None;
        if (leftDown && rightDown) {
            inputDirection = direction.None;
        } else if (leftDown) {
            inputDirection = direction.Left;
        } else if (rightDown) {
            inputDirection = direction.Right;
        }

        this.player.playerMovement(inputDirection);

        if (jumpDown) {
            this.player.playerJump();
        }

        this.player.update(inputDirection);
    }
}
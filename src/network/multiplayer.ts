import { Container } from "pixi.js";
import { socket } from "./socket";
import { BaseCharacter } from "../characters/BaseCharacter";
import { Tom } from "../characters/Tom";
import { Jenny } from "../characters/Jenny";
import { Mike } from "../characters/Mike";
import { Infected } from "../characters/Infected";

interface PlayerState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anim: string;
  character: "tom" | "jenny" | "mike" | "infected";
}

export class Multiplayer {
  public scene: Container;
  public otherPlayers: Record<string, BaseCharacter> = {};
  private onSpawnLocal: (type: string) => void;

  constructor(scene: Container, onSpawnLocal: (type: string) => void) {
    this.scene = scene;
    this.onSpawnLocal = onSpawnLocal;

    // ✅ Attach Listeners (using named functions defined below)
    socket.on("players", this.handlePlayers);
    socket.on("playerJoined", this.handlePlayerJoined);
    socket.on("playerMoved", this.handlePlayerMoved);
    socket.on("playerInfected", this.handlePlayerInfected);
    socket.on("playerDisconnected", this.handlePlayerDisconnected);
    socket.on("playerFrozen", this.handlePlayerFrozen);

    // Tell server we are ready
    socket.emit("initGame");
  }

  // ✅ 1. CLEANUP METHOD
  public destroy() {
    socket.off("players", this.handlePlayers);
    socket.off("playerJoined", this.handlePlayerJoined);
    socket.off("playerMoved", this.handlePlayerMoved);
    socket.off("playerInfected", this.handlePlayerInfected);
    socket.off("playerDisconnected", this.handlePlayerDisconnected);
    socket.off("playerFrozen", this.handlePlayerFrozen);
  }

  // ✅ 2. NAMED HANDLERS (Required for cleanup to work)

  private handlePlayers = (players: Record<string, PlayerState>) => {
    console.log("Received player list", players);
    for (const id in players) {
      const p = players[id];
      if (id === socket.id) {
        this.onSpawnLocal(p.character);
      } else {
        this.spawnRemotePlayer(id, p.character, p.x, p.y);
      }
    }
  };

  private handlePlayerJoined = (player: PlayerState) => {
    this.spawnRemotePlayer(player.id, player.character, player.x, player.y);
  };

  private handlePlayerMoved = (data: {
    id: string;
    x: number;
    y: number;
    anim: string;
  }) => {
    const remote = this.otherPlayers[data.id];
    if (!remote) return;

    // Smooth interpolation
    remote.x += (data.x - remote.x) * 0.35;
    remote.y += (data.y - remote.y) * 0.35;

    if (data.anim) {
      remote.playAnimation(data.anim);
    }
  };

  private handlePlayerInfected = (data: { id: string }) => {
    if (data.id === socket.id) return; // Ignore self

    const oldSprite = this.otherPlayers[data.id];
    if (oldSprite) {
      const { x, y } = oldSprite;
      this.scene.removeChild(oldSprite);
      delete this.otherPlayers[data.id];
      this.spawnRemotePlayer(data.id, "infected", x, y);
    }
  };

  private handlePlayerDisconnected = (id: string) => {
    const remote = this.otherPlayers[id];
    if (remote) {
      this.scene.removeChild(remote);
      delete this.otherPlayers[id];
    }
  };
  // ✅ NEW HANDLER: Visual Freeze for Remote Players
  private handlePlayerFrozen = (data: { id: string; duration: number }) => {
    // Ignore self (handled by GameMapScene)
    if (data.id === socket.id) return;

    const remoteChar = this.otherPlayers[data.id];
    if (remoteChar) {
      // Turn Blue
      remoteChar.setTint(0x0000ff);

      // Reset after duration
      setTimeout(() => {
        // Check if player still exists before resetting
        if (this.otherPlayers[data.id]) {
          this.otherPlayers[data.id].setTint(0xffffff); // White (Normal)
        }
      }, data.duration);
    }
  };

  // ✅ 3. SPAWN LOGIC
  private spawnRemotePlayer(
    id: string,
    character: "tom" | "jenny" | "mike" | "infected",
    x: number,
    y: number,
  ) {
    if (this.otherPlayers[id]) return;

    let player: BaseCharacter;

    if (character === "infected") player = new Infected();
    else if (character === "tom") player = new Tom();
    else if (character === "jenny") player = new Jenny();
    else player = new Mike();

    player.x = x;
    player.y = y;

    this.otherPlayers[id] = player;
    this.scene.addChild(player);
  }
}

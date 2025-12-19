import io from "socket.io-client";

export type CharacterType = "tom" | "jenny" | "mike" | "infected";
export interface PowerUpData {
  id: string;
  type: "speed" | "invis"; // Add | "invis" here if you implement that later
  x: number;
  y: number;
}

export interface PlayerState {
  x: number;
  y: number;
  character: CharacterType;
}

export interface PlayersPayload {
  [id: string]: PlayerState;
}

export interface MoveData {
  id: string;
  x: number;
  y: number;
}

export const socket = io("/", {
  path: "/socket.io",
  transports: ["websocket"],
});

// Variables to hold the callbacks from GameMapScene
let onSpawnPowerUp: ((data: PowerUpData) => void) | null = null;
let onRemovePowerUp: ((id: string) => void) | null = null;

// 1. Listen for Server Events
socket.on("spawnPowerUp", (data: PowerUpData) => {
  // console.log("Socket received spawnPowerUp:", data);
  if (onSpawnPowerUp) onSpawnPowerUp(data);
});

socket.on("removePowerUp", (data: { id: string }) => {
  // console.log("Socket received removePowerUp:", data.id);
  if (onRemovePowerUp) {
    // specific id or "all"
    onRemovePowerUp(data.id);
  }
});

// 2. Function to Send "I picked it up"
export function sendPowerUpCollected(id: string) {
  socket.emit("powerUpCollected", id);
}

// 3. Helper to register callbacks (Called by GameMapScene.ts)
export function setPowerUpListeners(
  spawnCallback: (data: PowerUpData) => void,
  removeCallback: (id: string) => void,
) {
  onSpawnPowerUp = spawnCallback;
  onRemovePowerUp = removeCallback;
}

// ------------------------
// CONNECTION
// ------------------------
socket.on("connect", () => {
  console.log("Connected to backend:", socket.id);
});

// ------------------------
// FULL SYNC (ON JOIN)
// ------------------------
socket.on("players", (players: PlayersPayload) => {
  console.log("Full player list:", players);
});

// ------------------------
// SINGLE JOIN
// ------------------------
socket.on("playerJoined", (data: { id: string } & PlayerState) => {
  console.log("Player joined:", data);
});

// ------------------------
// MOVEMENT
// ------------------------
//socket.on("playerMoved", (data: MoveData) => {
// console.log("Player moved:", data);
//});

// ------------------------
// DISCONNECT
// ------------------------
socket.on("playerDisconnected", (id: string) => {
  console.log("Player disconnected:", id);
});

// ------------------------
// SEND MOVEMENT
// ------------------------
export function sendMove(
  x: number,
  y: number,
  vx: number,
  vy: number,
  anim: string,
) {
  socket.emit("move", { x, y, vx, vy, anim });
}

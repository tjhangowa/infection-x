import io from "socket.io-client";

export type CharacterType = "tom" | "jenny" | "mike"| "infected";
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
socket.on("playerMoved", (data: MoveData) => {
  console.log("Player moved:", data);
});

// ------------------------
// DISCONNECT
// ------------------------
socket.on("playerDisconnected", (id: string) => {
  console.log("Player disconnected:", id);
});

// ------------------------
// SEND MOVEMENT
// ------------------------
export function sendMove(x: number, y: number, anim: string) {
  socket.emit("move", { x, y, anim });
}

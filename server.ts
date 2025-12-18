import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

// ------------------------
// PLAYER STATE
// ------------------------
// ✅ UPDATED: Added "infected"
type CharacterType = "tom" | "jenny" | "mike" | "infected";

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  character: CharacterType;
}

const players: Record<string, PlayerState> = {};
const availableCharacters: CharacterType[] = ["tom", "jenny", "mike"];

// ✅ NEW: Track lobby and the Alpha Zombie
let connectedIds: string[] = [];
let alphaInfectedId: string | null = null;

// ------------------------
// SOCKET SERVER
// ------------------------
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("joinLobby", () => {
    // 1. Add to lobby list NOW (only when they claim they are ready)
    if (!connectedIds.includes(socket.id)) {
      connectedIds.push(socket.id);
    }
    //2. broadcast updated count
    io.emit("lobbyUpdate", { count: connectedIds.length });

    // 3. CHECK START CONDITION (Pick Alpha)
    if (connectedIds.length >= 2 && !alphaInfectedId) {
      // Pick ONE random player to be the Alpha Infected
      alphaInfectedId =
        connectedIds[Math.floor(Math.random() * connectedIds.length)];
      console.log(`Game Starting! Alpha Infected is: ${alphaInfectedId}`);
      io.emit("startGame");
    }
  });

  // 3. GAME INIT
  socket.on("initGame", () => {
    console.log(`Player ${socket.id} is ready via initGame`);

    // ✅ CHECK: Is this player the Alpha?
    const isAlpha = socket.id === alphaInfectedId;
    let assignedCharacter: CharacterType;

    if (isAlpha) {
      assignedCharacter = "infected"; // Force infection
    } else {
      // Normal Human Logic
      assignedCharacter = "tom";
      if (availableCharacters.length > 0) {
        assignedCharacter = availableCharacters.splice(
          Math.floor(Math.random() * availableCharacters.length),
          1,
        )[0];
      }
    }

    // Add player FIRST
    players[socket.id] = {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      vx: 0,
      vy: 0,
      character: assignedCharacter,
    };

    console.log(`Assigned ${assignedCharacter} to ${socket.id}`);

    // Send FULL snapshot to the new client
    const payload = Object.fromEntries(
      Object.entries(players).map(([id, p]) => [
        id,
        { id, ...p, anim: "idle_east" },
      ]),
    );

    socket.emit("players", payload);

    // Notify everyone else about this new player
    socket.broadcast.emit("playerJoined", {
      id: socket.id,
      ...players[socket.id],
      anim: "idle_east",
    });
  });

  // ------------------------
  // MOVEMENT UPDATES
  // ------------------------
  socket.on(
    "move",
    (data: { x: number; y: number; vx: number; vy: number; anim: string }) => {
      const player = players[socket.id];
      if (!player) return;

      player.x = data.x;
      player.y = data.y;
      player.vx = data.vx;
      player.vy = data.vy;

      io.emit("playerMoved", {
        id: socket.id,
        x: data.x,
        y: data.y,
        vx: data.vx,
        vy: data.vy,
        anim: data.anim,
      });
    },
  );

  // ------------------------
  // ✅ NEW: INFECTION EVENT
  // ------------------------
  socket.on("infectPlayer", (targetId: string) => {
    const target = players[targetId];

    // Only infect if target exists and isn't ALREADY infected
    if (target && target.character !== "infected") {
      console.log(`Player ${socket.id} infected ${targetId}`);

      target.character = "infected"; // Update Server State

      // Broadcast to everyone to swap sprites
      io.emit("playerInfected", { id: targetId });
    }
  });
  // ✅ NEW: PARRY EVENT broadcast to everyone now
  socket.on("parryZombie", (zombieId: string) => {
    // 1. Validate that 'zombieId' is actually infected
    const zombie = players[zombieId];
    if (zombie && zombie.character === "infected") {
      console.log(`Player ${socket.id} parried Zombie ${zombieId}`);

      // 2. Tell EVERYONE including the zombie to freeze this socket ID (stunned)
      io.emit("playerFrozen", { id: zombieId, duration: 3000 });
    }
  });

  // ------------------------
  // DISCONNECT CLEANUP
  // ------------------------
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove from lobby
    connectedIds = connectedIds.filter((id) => id !== socket.id);
    io.emit("lobbyUpdate", { count: connectedIds.length });

    // Handle character return to pool (only if human)
    const character = players[socket.id]?.character;
    if (character && character !== "infected") {
      availableCharacters.push(character);
    }

    // Reset Alpha if they leave (optional reset logic)
    if (socket.id === alphaInfectedId) {
      alphaInfectedId = null;
    }

    delete players[socket.id];

    io.emit("playerDisconnected", socket.id);
  });
});

server.listen(port, () => {
  console.log(` Server running on http://localhost:${port}`);
});

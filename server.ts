import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ------------------------
// GAME CONSTANTS
// ------------------------
const MATCH_DURATION = 300; // 5 Minutes in seconds
const MAP_DEATH_Y = 1500; // Y-height to die
const LOBBY_RETURN_TIME = 10;
const MATCH_COUNTDOWN_SEC = 5; // 5 seconds before GO!
const MIN_PLAYERS_TO_START = 4;
const POWERUP_LOCATIONS = [
  { x: 150, y: 350 }, // Left Mid Tree
  { x: 250, y: 550 }, // Bottom Left Car
  { x: 400, y: 200 }, // Top Center Tree
  { x: 700, y: 400 }, // Right Mid Building
  { x: 750, y: 100 }, // Top Right Moon area
  { x: 800, y: 550 }, // Bottom Right
];

// ------------------------
// POWERUP STATE
// ------------------------
interface PowerUp {
  id: string;
  type: "speed" | "invis";
  x: number;
  y: number;
}

// ✅ CHANGED: Now an array to support multiple types at once
let activePowerUps: PowerUp[] = [];

// Spawn Schedule
const SPAWN_SCHEDULE = [
  { time: 30, type: "speed" },
  { time: 60, type: "invis" },
  { time: 120, type: "speed" },
  { time: 180, type: "speed" },
  { time: 182, type: "invis" },
  { time: 240, type: "speed" },
];

let triggeredSpawns: number[] = [];

// ------------------------
// PLAYER STATE
// ------------------------
type CharacterType = "tom" | "jenny" | "mike" | "infected";

interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  character: CharacterType;
  isAttacking?: boolean;
  isAlive: boolean;
}

const players: Record<string, PlayerState> = {};
const availableCharacters: CharacterType[] = ["tom", "jenny", "mike"];

// ------------------------
// GAME STATE
// ------------------------
let connectedIds: string[] = [];
let alphaInfectedId: string | null = null;
let matchState: "LOBBY" | "PLAYING" | "ENDED" = "LOBBY";

// Timestamps
let matchStartTime = 0; // When the countdown ENDS and game actually starts
let lobbyReturnTime = 0;

// ------------------------
// SOCKET SERVER
// ------------------------
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("joinLobby", () => {
    if (!connectedIds.includes(socket.id)) {
      connectedIds.push(socket.id);
    }
    io.emit("lobbyUpdate", {
      count: connectedIds.length,
      required: MIN_PLAYERS_TO_START,
    });

    if (connectedIds.length >= MIN_PLAYERS_TO_START && matchState === "LOBBY") {
      startGame();
    }
  });

  // 3. GAME INIT
  socket.on("initGame", () => {
    console.log(`Player ${socket.id} is ready via initGame`);

    const isAlpha = socket.id === alphaInfectedId;
    let assignedCharacter: CharacterType;

    if (isAlpha) {
      assignedCharacter = "infected";
    } else {
      assignedCharacter = "tom";
      if (availableCharacters.length > 0) {
        assignedCharacter = availableCharacters.splice(
          Math.floor(Math.random() * availableCharacters.length),
          1,
        )[0];
      }
    }

    // ✅ NEW: SPECIFIC SPAWN LOCATIONS
    let startX = 0;
    let startY = 600; // Default floor

    if (assignedCharacter === "infected") {
      startX = 150; // Bottom Left
      startY = 850; // Adjust based on your map floor Y
    } else {
      startX = 1600; // Bottom Right
      startY = 850;
    }

    players[socket.id] = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      character: assignedCharacter,
      isAlive: true,
    };

    // Send FULL snapshot
    const payload = Object.fromEntries(
      Object.entries(players).map(([id, p]) => [
        id,
        { id, ...p, anim: "idle_east" },
      ]),
    );

    socket.emit("players", payload);

    // Send currently active powerups
    activePowerUps.forEach((p) => {
      socket.emit("spawnPowerUp", p);
    });

    // Notify others
    socket.broadcast.emit("playerJoined", {
      id: socket.id,
      ...players[socket.id],
      anim: "idle_east",
    });

    // ✅ NEW: Send the Countdown Timer to this new player
    socket.emit("matchStartTimer", { startTime: matchStartTime });
  });

  // ------------------------
  // MOVEMENT UPDATES
  // ------------------------
  socket.on("move", (data) => {
    const player = players[socket.id];
    if (!player) return;

    if (matchState === "PLAYING" && player.isAlive && data.y > MAP_DEATH_Y) {
      handlePlayerDeath(socket.id);
    }

    if (player.isAlive) {
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
    }
  });

  // PowerUp Collection Handler
  socket.on("powerUpCollected", (id: string) => {
    // ✅ Find in array
    const index = activePowerUps.findIndex((p) => p.id === id);

    if (index !== -1) {
      const powerUp = activePowerUps[index];
      console.log(`PowerUp ${id} collected by ${socket.id}`);

      // 1. Remove from server array
      activePowerUps.splice(index, 1);

      // 2. Tell EVERYONE to remove it visually
      io.emit("removePowerUp", { id });

      // 3. Apply Effect
      const duration = powerUp.type === "speed" ? 10000 : 20000;
      io.emit("playerPowerUpActive", {
        id: socket.id,
        type: powerUp.type,
        duration: duration,
      });
    }
  });

  // ------------------------
  // INFECTION EVENT
  // ------------------------
  // ✅ RE-ADDED LOGIC HERE
  socket.on("infectPlayer", (targetId: string) => {
    const target = players[targetId];

    // Only infect if target exists, is ALIVE, and isn't ALREADY infected
    if (target && target.isAlive && target.character !== "infected") {
      console.log(`Player ${socket.id} infected ${targetId}`);
      target.character = "infected"; // Update Server State
      // Broadcast to everyone to swap sprites
      io.emit("playerInfected", { id: targetId });
    }
  });

  // Zombie Attack State Handlers
  // ✅ RE-ADDED LOGIC HERE
  socket.on("startAttack", () => {
    const p = players[socket.id];
    if (p) p.isAttacking = true;
  });

  socket.on("endAttack", () => {
    const p = players[socket.id];
    if (p) p.isAttacking = false;
  });

  // Parry Logic
  // ✅ RE-ADDED LOGIC HERE
  socket.on("parryZombie", (zombieId: string) => {
    const zombie = players[zombieId];

    if (zombie && zombie.character === "infected") {
      if (zombie.isAttacking) {
        console.log(`Player ${socket.id} SUCCESSFUL PARRY on ${zombieId}`);
        io.emit("playerFrozen", { id: zombieId, duration: 3000 });
        zombie.isAttacking = false;
        io.to(zombieId).emit("forceCancelAttack");
      } else {
        console.log(`Player ${socket.id} FAILED PARRY`);
        socket.emit("parryFailed");
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    connectedIds = connectedIds.filter((id) => id !== socket.id);
    io.emit("lobbyUpdate", { count: connectedIds.length });
    const character = players[socket.id]?.character;
    if (character && character !== "infected")
      availableCharacters.push(character);
    if (socket.id === alphaInfectedId) alphaInfectedId = null;
    if (matchState === "PLAYING" && players[socket.id]?.isAlive)
      handlePlayerDeath(socket.id);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// --------------------------------------------------------
//  GAME MASTER FUNCTIONS
// --------------------------------------------------------

function startGame() {
  matchState = "PLAYING";

  // ✅ NEW: Countdown Logic
  // The match officially "starts" logic-wise 5 seconds from now
  matchStartTime = Date.now() + MATCH_COUNTDOWN_SEC * 1000;

  // Pick Alpha
  if (connectedIds.length > 0) {
    alphaInfectedId =
      connectedIds[Math.floor(Math.random() * connectedIds.length)];
    console.log(`Game Starting! Alpha Infected is: ${alphaInfectedId}`);
  }

  // 3. ✅ FORCE RESET ALL PLAYERS (Roles & Positions)
  connectedIds.forEach((id) => {
    // A. Determine Role
    const isAlpha = id === alphaInfectedId;
    let newChar: CharacterType = "tom";

    if (isAlpha) {
      newChar = "infected";
    } else {
      // Pick random survivor
      const survivors: CharacterType[] = ["tom", "jenny", "mike"];
      newChar = survivors[Math.floor(Math.random() * survivors.length)];
    }

    // B. Determine Spawn (Left vs Right)
    let startX = 1600; // Default Right (Survivors)
    const startY = 850;

    if (newChar === "infected") {
      startX = 150; // Left (Infected)
    }

    // C. Update Server State
    if (players[id]) {
      players[id].character = newChar;
      players[id].x = startX;
      players[id].y = startY;
      players[id].isAlive = true;
      players[id].vx = 0;
      players[id].vy = 0;
    }
  });

  // 4. RESET POWERUP SYSTEM
  triggeredSpawns = [];
  activePowerUps = []; // Clear array
  // Notify clients
  io.emit("removePowerUp", { id: "all" });

  // 5. ✅ EMIT NEW STATE
  // We send the 'players' event again so clients redraw everyone with new roles
  const payload = Object.fromEntries(
    Object.entries(players).map(([id, p]) => [
      id,
      { id, ...p, anim: "idle_east" },
    ]),
  );
  io.emit("players", payload);

  // 6. Start Match Logic
  io.emit("startGame", {
    total: connectedIds.length,
    alphaId: alphaInfectedId,
  });

  // ✅ NEW: Send the Countdown Timer immediately
  io.emit("matchStartTimer", { delay: MATCH_COUNTDOWN_SEC * 1000 });

  // ✅ FIX: Send initial HUD update so it doesn't show 0:00 or start running
  io.emit("matchUpdate", {
    time: MATCH_DURATION, // 300 seconds
    alive: connectedIds.length,
    total: connectedIds.length,
  });
}

// ✅ GAME LOOP
setInterval(() => {
  if (matchState !== "PLAYING") return;

  // 1. Check if Countdown is finished
  if (Date.now() < matchStartTime) return; // Wait for GO!

  checkWinConditions();

  // 2. Calculate elapsed GAME time (starts counting AFTER the 5s delay)
  const elapsedSeconds = Math.floor((Date.now() - matchStartTime) / 1000);

  // 3. Check the Schedule
  SPAWN_SCHEDULE.forEach((event, index) => {
    if (!triggeredSpawns.includes(index)) {
      if (elapsedSeconds >= event.time) {
        // ✅ NEW: Check duplicate type
        const typeExists = activePowerUps.some((p) => p.type === event.type);

        if (!typeExists) {
          triggeredSpawns.push(index);
          spawnPowerUp(event.type as "speed" | "invis");
        } else {
          console.log(`Skipping ${event.type} spawn - Type already active.`);
          // Mark as triggered so we don't spam logs
          triggeredSpawns.push(index);
        }
      }
    }
  });
}, 1000);

function spawnPowerUp(type: "speed" | "invis") {
  const loc =
    POWERUP_LOCATIONS[Math.floor(Math.random() * POWERUP_LOCATIONS.length)];

  // Basic overlap check (don't spawn on top of another existing one)
  const isOccupied = activePowerUps.some((p) => p.x === loc.x && p.y === loc.y);
  if (isOccupied) return;

  const newPowerUp: PowerUp = {
    id: `${type}-${Date.now()}`,
    type: type,
    x: loc.x,
    y: loc.y,
  };

  activePowerUps.push(newPowerUp); // Add to array
  console.log(`Spawned ${type} at [${loc.x}, ${loc.y}]`);
  io.emit("spawnPowerUp", newPowerUp);
}

function handlePlayerDeath(id: string) {
  if (!players[id]) return;
  players[id].isAlive = false;
  io.emit("playerDied", { id });
  checkWinConditions();
}

function checkWinConditions() {
  if (matchState !== "PLAYING") return;

  const now = Date.now();
  // Calculate remaining time based on 5 minute duration + the start time
  const matchEndTime = matchStartTime + MATCH_DURATION * 1000;
  const timeRemaining = Math.max(0, Math.ceil((matchEndTime - now) / 1000));

  let survivors = 0;
  let infected = 0;
  let aliveCount = 0;

  connectedIds.forEach((id) => {
    const p = players[id];
    if (p && p.isAlive) {
      aliveCount++;
      if (p.character === "infected") infected++;
      else survivors++;
    }
  });

  io.emit("matchUpdate", {
    time: timeRemaining,
    alive: aliveCount,
    total: connectedIds.length,
  });

  // Win Logic (Same as before)
  if (survivors === 0 && infected > 0)
    endGame("The INFECTED win!", "All Survivors turned!", "#FF0000");
  if (survivors === 0 && infected === 0)
    endGame("The INFECTED win!", "Everyone Perished!", "#FF0000");
  if (infected === 0 && survivors > 0)
    endGame("The SURVIVORS win!", "Infected Perished!", "#00FF00");
  if (timeRemaining <= 0) {
    if (survivors > 0) endGame("MATCH OVER!", "SURVIVORS win!", "#00FF00");
    else endGame("MATCH OVER!", "INFECTED win!", "#FF0000");
  }
}

function endGame(mainText: string, subText: string, color: string) {
  matchState = "ENDED";
  lobbyReturnTime = LOBBY_RETURN_TIME;
  io.emit("gameOver", { mainText, subText, color });

  const interval = setInterval(() => {
    lobbyReturnTime--;
    io.emit("lobbyTimer", { time: lobbyReturnTime });
    if (lobbyReturnTime <= 0) {
      clearInterval(interval);
      resetLobby();
    }
  }, 1000);
}

function resetLobby() {
  matchState = "LOBBY";
  alphaInfectedId = null;
  activePowerUps = [];
  io.emit("removePowerUp", { id: "all" });
  io.emit("returnToLobby");
}

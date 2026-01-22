# 🧟 INFECTED: LAST STAND

> **A fast-paced, free-for-all multiplayer survival game.**

**Project Type:** Software Engineering Course Final Project  
**Genre:** Multiplayer Survival / Platformer  
**Status:** Finished 

---

## ☣️ The Outbreak: Project Overview

**INFECTED: LAST STAND** is a fast-paced, free-for-all multiplayer survival game developed as a final project for our Software Engineering course. Set in a desolate urban environment, the game uses a dynamic, real-time infection mechanic to pit four players against each other.

The core premise is simple: **Survival is a race against the clock and the contagion.**

### 📝 Game Objective

* **The Infected:** One player starts as the Infected. Their sole mission is to tag and infect every other survivor before the timer runs out.
* **The Survivors:** Three players start as Survivors. They must evade the Infected until the designated time limit expires.

### 🏆 Win Conditions

1.  **The Infected Win:** If all players become Infected before the timer hits zero.
2.  **The Survivors Win:** If the timer runs out with any Survivor remaining healthy.

---

## 🛠️ Tech Stack & Architecture

This project is built using a modern TypeScript stack, leveraging **Pixi.js** for rendering, **Matter.js** for physics, and **Socket.io** for real-time multiplayer networking.

### 📂 Directory Structure

The project is organized into a client-server architecture. Below is the breakdown of the codebase:

#### **Core Engine (`src/core`)**
The backbone of the game engine, handling the loop, rendering, and physics.
* `app.ts`: Initializes the Pixi.js application.
* `SceneManager.ts`: Handles scene transitions and ensures only the active scene is rendered.
* `physics/CollisionManager.ts`: Centralized collision handling using Matter.js.
* `camera/Camera2D.ts`: Implements player-centered camera.
* `PowerUpManager.ts`: Handles spawning, applying, tracking, and removing power-ups.

#### **Networking (`src/network` & Root)**
Handles real-time state synchronization between clients.
* `server.ts` *(Root)*: Authoritative Node.js server. Tracks player state, validates movement, and broadcasts updates.
* `socket.ts`: Client-side socket.io connection.
* `multiplayer.ts`: Manages remote player creation, player synchronization, and join/leave events.

#### **Actors & Characters (`src/actors`, `src/characters`)**
Entities that interact with the game world.
* `PlayerActor.ts`: Defines player entity that interacts with physics and gameplay systems.
* `baseCharacter.ts`: Base class shared by all characters.
* `Tom.ts`, `Jenny.ts`, `Mike.ts`: Survivor character implementations.
* `Infected.ts`: Infected/zombie character implementation.

#### **Game World & Objects (`src/objects`, `src/scene`)**
* **Scenes:**
    * `MainMenuScene.ts`: Displays title screen and main menu buttons.
    * `WaitingLobbyScene.ts`: Lobby where players wait for others to join.
    * `GameMapScene.ts`: Main gameplay scene.
    * `DemoMapScene.ts`: Development/testing scene for maps and mechanics.
* **Objects:**
    * `Platform.ts`: Represents physical platforms in the map (visuals + physics).
    * `terrain/`: Stores base classes for terrain, ground, and walls.

#### **UI & UX (`src/ui`)**
User interface components overlaying the game.
* `GameHud.ts` & `CountdownUI.ts`: Displays status info and match timers.
* `InfoModal.ts` & `SettingsModal.ts`: Displays instructions and settings (volume, controls).
* `ModalManager.ts`: Central manager for opening/closing UI modals.
* `InfectionIndicator.ts`: Visual indicator for infection attempts.
* `ParryUI.ts`: Displays parry cooldown and status.
* `textbutton.ts`: Reusable UI button component.

#### **Power-Ups (`src/powerups`)**
* `base/PowerUp.ts`: Abstract base class for all power-ups.
* `base/PowerUpTypes.ts`: Enum defining available power-up types.
* `implementations/`: Specific logic for abilities (e.g., speed, invisibility).

#### **Assets & Utilities**
* `public/`: Static assets (Sprites, Maps, UI images).
* `src/input/keyboard.ts`: Centralized keyboard input handler.
* `scripts/convertplatforms.js`: Utility to convert platform rotation to platform steps.

---

## ⚙️ Configuration & Setup

* **Build Tool:** Vite (`vite.config.ts`)
* **Language:** TypeScript (`tsconfig.json`, `tsconfig.server.json`)
* **Dependencies:** Managed via `package.json`

*Developed as a Final Project for Software Engineering.*

# 🧟 INFECTED: LAST STAND ⏱️

## Status: Project In Development 

## ☣️ The Outbreak: Project Overview

- INFECTED: LAST STAND is a fast-paced, free-for-all multiplayer survival game developed as a final project for our Software Engineering course. Set in a desolate urban environment, the game uses a dynamic, real-time infection mechanic to pit four players against each other.

- The core premise is simple: Survival is a race against the clock and the contagion.

## 📝 Game Objective
- The Infected: One player starts as the Infected. Their sole mission is to tag and infect every other survivor before the timer runs out.
- The Survivors: Three players start as Survivors. They must evade the Infected until the designated {XX:XX} time limit expires. 


## 🏆 Win Conditions 🏆
1. If all players become Infected before the timer hits zero, The Infected Win.
2. If the timer runs out with any Survivor remaining healthy, The Survivors Win.

public/
Contains all static assets used by the game:
 - Sprite images (characters, power-ups)
 - Map backgrounds
 - UI images
 - Animation layers

scripts/convertplatforms.js
 - Converts platform rotation to platform steps.

src/actors/PlayerActor.ts
 - Defines player entity that interacts with physics and gameplay systems.

src/characters
 Defines all playable character sprites and animations.
 - baseCharacter.ts 
    - Base class shared by all characters. Handles:
 - Tom.ts, Jenny.ts, Mike.ts
    - Survivor character implementations extending BaseCharacter.
 - Infected.ts
    - Infected/zombie character implementation 

src/core
Core engine-level systems used throughout the game.
 - camera/Camera2D.ts
    - Implements player-centered camera
 - physics/CollisionManager.ts
    - Centralized collision handling using Matter.js
 - app.ts
    - Initializes the pixi.js application
 - SceneManager.ts
    - Handles scene transitions and ensures only the active scene is rendered
 - PowerUpManager.ts
    - Handles spawning, applying, tracking, and removing power-ups.

src/input/keyboard.ts
 - Centralized keyboard input handler

src/network
Handles all multiplayer networking logic.
 - socket.ts
    - Client-side socket.io connection
 - multiplayer.ts
    - manages remote player creation, player synchronization, join/leave events

src/objects
Game world objects
- Platform.ts
    - Represents physical playforms in the map, combining visuals and physics
 - terrain/
    - stores base classes for terrain, ground, and wall

src/powerups
power-up system implementation
 - base/PowerUp.ts
    - Abstract base class for all power-ups.
 - base/PowerUpTypes.ts
    - Enum defining available power-up types
 - implementations/
    - implementation of speed and invisibility power-ups

src/scene
Each scene represents a major game state.
 - BaseScene.ts
    - Base class for all scenes.
 - MainMenuScene.ts
    - Displays title screen and main menu buttons.
 - WaitingLobbyScene.ts
    - Lobby where players wait for others to join before the match starts.
 - DemoMapScene.ts
    - Development/testing scene for maps and mechanics.
 - GameMapScene.ts
    Main gameplay scene.

src/ui
All user interface components.
 - InfoModal.ts
    - Displays game instructions and information.
 - SettingsModal.ts
    - Settings UI (volume, controls).
 - ModalManager.ts
    - Central manager for opening/closing UI modals.
 - GameHud.ts
    - In-game HUD displaying status information.
 - CountdownUI.ts
    - Displays match countdown timers.
 - InfectionIndicator.ts
    - Visual indicator for infection attempts.
 - ParryUI.ts
    - Displays parry cooldown and status.
 - textbutton.ts
    - Reusable UI button component.

main.ts
Initializes the app, sets up scene manager, starts game

server.ts
Authoritative Node.js server.
 - Tracks player state
 - Validates movement
 - Broadcasts updates

vite.config.ts
Build configuration for Vite 

tsconfig.json / tsconfig.server.json
TypeScript configuration for client and server builds.

package.json / package-lock.json
Project dependencies and scripts.



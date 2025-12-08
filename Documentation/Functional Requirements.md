Table of Contents  

1. Introduction  

1.1 Purpose  

1.2 Project Scope  

1.3 Intended Audience  

1.4 References  

2. Overall Description  

2.1 Stakeholder Requirements  

2.2 User Stories  

3. System Requirements  

3.1 Functional Requirements  

3.2 Non-Functional Requirements  

3.3 System Architecture Requirements  

4.Appendices  

  

-----------------------------------------------------

1. Introduction  

  

2. Overall Description 

2.1 Stakeholder Requirements 

SR-: Stakeholders expect the game server to remain available and maintain stable connections. 

SR-: Stakeholders need player data (position, identity, state) to sync reliably across clients. 

SR-: Players need the game to provide fast-paced, short sessions that are easy to join and replay. 

SR-: Players expect the infection game mode to be clear, fair, and consistent. 

SR-: Players want other players’ positions and actions to appear smooth and responsive during multiplayer gameplay. 

 

2.2 User Stories 

US-01 As a player, I want matches to last around 5–10 minutes so that the game feels fast-paced and doesn’t get repetitive. 
 
US-02 As a runner, I want movement-based power-ups like speed boosts or dashes so that I can escape infected players more effectively. 
 
US-03 As an infected player, I want stealth or disguise abilities so that I can approach runners without being easily detected. 
 
US-05 As a player, I want counterplay abilities (e.g., cures, stuns) so that there are multiple strategic options during a match. 
 
US-06 As a player, I want power-ups to be balanced so that neither side becomes overpowered. 
 

3. System Requirements   

3.1 Functional Requirements  

FR-: The system shall manage scene creation, loading, and destruction using a centralized scene manager. 

FR-: The system shall ensure that only the active scene is rendered and receives input. 

FR-: When the game starts, the system shall display a main menu containing the title and available actions. 

FR-: When the user selects the “Info” button, the system shall display an informational modal overlay. 

FR-: When the user selects the “Settings” button, the system shall display the settings modal overlay. 

FR-: When the user selects the “Start” button, the system shall transition from the main menu to the waiting lobby scene. 

FR-: When a player joins a lobby, the system shall assign them a unique player ID and initial team state  

FR-: When the user presses directional input, the system shall update player position on the client and synchronize movement via WebSocket updates.  

FR-: When movement updates are received from the server, the client shall render updated positions immediately.  

FR-: When a player collects a power-up, the system shall apply the corresponding effect  

FR-: When a player is converted, the system shall broadcast the updated status to all connected players  

FR-: When a match ends, the system shall determine the winning team based on number of players per team  

 

 

  

  

  

 
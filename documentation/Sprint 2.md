## SPRINT 2
- FR 7-8, 10: The system shall synchronize player states, world events, and game-specific variables across all clients using a server-authoritative model via WebSockets.
- FR 13: The system shall implement a "lerp" (linear interpolation) smoothing effect for the camera and support screen-shake triggers during specific game events.
- FR 15: The system shall manage sprite transitions (idle, run, jump, action) to ensure animations do not clip, freeze, or play out of sequence during rapid state changes.
- FR 16: The system shall resolve physics-based collisions by preventing object interpenetration and ensuring consistent bounce/friction responses across different frame rates.
- FR 17: The system shall randomly spawn power-up entities on the map and calculate specific stat modifiers (e.g., speed boost, invincibility) upon player contact.
- FR 19: When a match concludes, the system shall display a leaderboard showing the winning team and a procedurally generated description of the match highlights.
- FR 20: The system shall maintain a synchronized countdown clock; when the timer reaches zero, the system shall trigger the match-end sequence.

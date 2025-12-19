import { keys } from "../input/keyboard";

export type Action =
  | "moveLeft"
  | "moveRight"
  | "jump"
  | "infect"
  | "parry";

export const defaultKeybinds: Record<Action, string[]> = {
  moveLeft: ["a", "arrowleft"],
  moveRight: ["d", "arrowright"],
  jump: ["w", "arrowup", " "],
  infect: ["e"],
  parry: ["p"],
};

let keybinds: Record<Action, string[]> = { ...defaultKeybinds };

export function loadKeybinds() {
  const saved = localStorage.getItem("keybinds");
  if (saved) keybinds = JSON.parse(saved);
}

export function saveKeybinds() {
  localStorage.setItem("keybinds", JSON.stringify(keybinds));
}

export function getKeysFor(action: Action): string[] {
  return keybinds[action];
}

export function setKeysFor(action: Action, keys: string[]) {
  keybinds[action] = keys.map(k => k.toLowerCase());
  saveKeybinds();
}

export function addKeyFor(action: Action, key: string) {
  const k = key.toLowerCase();
  if (!keybinds[action].includes(k)) {
    keybinds[action].push(k);
    saveKeybinds();
  }
}

export function removeKeyFor(action: Action, key: string) {
  keybinds[action] = keybinds[action].filter(k => k !== key.toLowerCase());
  saveKeybinds();
}

export function isActionDown(action: Action): boolean {
  return getKeysFor(action).some(k => keys[k]);
}

export function isActionKey(action: Action, key: string): boolean {
  return getKeysFor(action).includes(key.toLowerCase());
}
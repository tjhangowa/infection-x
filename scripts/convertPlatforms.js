#!/usr/bin/env node

/**
 * Converts rotated platforms into stepped slopes for Matter.js
 * - rotation ~ 0   -> flat platform
 * - rotation != 0  -> slope { rise, steps, direction }
 */

const fs = require("fs");
const path = require("path");

// ---- CONFIG ----
const INPUT_FILE = path.resolve(
  __dirname,
  "../public/assets/config/demoMapPlatforms.json"
);
const OUTPUT_FILE = path.resolve(
  __dirname,
  "../public/assets/config/demoMapPlatforms.converted.json"
);

const ROTATION_EPSILON = 0.05; // radians (~3 degrees)
const MAX_STEP_HEIGHT = 8; // px
const DEFAULT_RISE = 32; // px fallback

// ---- LOAD ----
if (!fs.existsSync(INPUT_FILE)) {
  console.error("❌ Input JSON not found:", INPUT_FILE);
  process.exit(1);
}

const raw = fs.readFileSync(INPUT_FILE, "utf8");
const platforms = JSON.parse(raw);

if (!Array.isArray(platforms)) {
  console.error("❌ JSON root is not an array");
  process.exit(1);
}

console.log(`🔍 Loaded ${platforms.length} platforms`);

const converted = platforms.map((p, index) => {
  if (!("rotation" in p)) {
    return p; // already clean
  }

  const rot = p.rotation ?? 0;

  // ---- Flat platform ----
  if (Math.abs(rot) < ROTATION_EPSILON) {
    const { rotation, ...rest } = p;
    return rest;
  }

  // ---- Sloped platform ----
  const direction = rot > 0 ? "right" : "left";

  // Estimate rise from width ratio (rough but safe)
  const estimatedRise = Math.max(
    DEFAULT_RISE,
    Math.round(p.wRatio * 1920 * Math.abs(Math.sin(rot)))
  );

  const steps = Math.max(
    4,
    Math.ceil(estimatedRise / MAX_STEP_HEIGHT)
  );

  const { rotation, ...rest } = p;

  return {
    ...rest,
    slope: {
      rise: estimatedRise,
      steps,
      direction,
    },
  };
});

// ---- SAVE ----
fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(converted, null, 2),
  "utf8"
);

console.log("✅ Conversion complete");
console.log("➡ Output written to:");
console.log(OUTPUT_FILE);




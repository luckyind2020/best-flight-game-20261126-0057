// Skyhawk Ridge Run — the valley.
// Terrain, river, runway and the ring course, all derived from seeded noise
// so the valley is endless, deterministic, and the same for every pilot.
import { CONFIG } from "./config.js";
import { makeNoise1D } from "./random.js";

const ridgeNoise = makeNoise1D(1337);
const floorNoise = makeNoise1D(9021);
const riverNoise = makeNoise1D(777);

/** Ground height in feet at world position (x, z). */
export function groundHeight(x, z) {
  const ax = Math.abs(x);
  const floor = 60 * Math.sin(z * 0.0011) + 40 * floorNoise(z * 0.0009);
  const beyond = Math.max(0, ax - CONFIG.valley.ridgeStart);
  const ridge =
    Math.pow(beyond / 900, 1.6) *
    CONFIG.valley.ridgeHeight *
    (0.55 + 0.45 * ridgeNoise(x * 0.0016 + z * 0.0004));
  let h = floor + ridge;
  // The runway strip is graded flat.
  const rw = CONFIG.runway;
  if (Math.abs(x) < 220 && z > rw.zStart - 300 && z < rw.zEnd + 300) {
    const edge = Math.min(1, (220 - Math.abs(x)) / 120);
    h *= 1 - edge * 0.95;
  }
  return h;
}

/** Lateral centre of the river at distance z. */
export function riverX(z) {
  return 900 * Math.sin(z * 0.00021) + 260 * riverNoise(z * 0.0006);
}

/** The ring course: ten golden rings down the valley. */
export function makeRings() {
  const rings = [];
  for (let i = 0; i < CONFIG.rings.count; i += 1) {
    const z = CONFIG.rings.firstZ + i * CONFIG.rings.spacing;
    rings.push({
      x: 950 * Math.sin(i * 1.7),
      y: 750 + 420 * Math.sin(i * 2.3),
      z,
      passed: false,
      centred: false,
    });
  }
  return rings;
}

/** The next ring the pilot has not passed yet, or null when the course is done. */
export function nextRing(rings) {
  for (const ring of rings) if (!ring.passed) return ring;
  return null;
}

/** True when the aircraft is over the runway strip. */
export function overRunway(x, z) {
  const rw = CONFIG.runway;
  return Math.abs(x) < rw.halfWidth && z > rw.zStart && z < rw.zEnd;
}

// Skyhawk Ridge Run — screenshot scenes.
// `?shot=takeoff|cruise|rings|final` drops the aircraft into a staged
// moment so the maker can capture real renders of the game for the entry.
// Each preset is a full flight state; the game starts flying at once.
import { CONFIG } from "./config.js";

export const SHOTS = {
  takeoff: {
    label: "Takeoff roll",
    x: 0,
    z: 19800,
    alt: 60,
    speed: 210,
    hdg: 0,
    pitch: 8,
    roll: 0,
    throttle: 1,
    fuel: 100,
  },
  cruise: {
    label: "Valley cruise",
    x: 300,
    z: 8200,
    alt: 1250,
    speed: 280,
    hdg: 4,
    pitch: -1,
    roll: 6,
    throttle: 0.7,
    fuel: 82,
  },
  rings: {
    label: "Ring approach",
    x: 880,
    z: 3350,
    alt: 1040,
    speed: 265,
    hdg: 2,
    pitch: 0,
    roll: -4,
    throttle: 0.7,
    fuel: 74,
  },
  final: {
    label: "Final approach",
    x: -60,
    z: 17600,
    alt: 320,
    speed: 150,
    hdg: 1,
    pitch: -4,
    roll: 2,
    throttle: 0.45,
    fuel: 61,
  },
};

/** The shot named in the URL, or null when the game opens normally. */
export function shotFromUrl() {
  const name = new URLSearchParams(window.location.search).get("shot");
  if (!name || !Object.hasOwn(SHOTS, name)) return null;
  return { name, ...SHOTS[name] };
}

/** Place a flight at a shot preset and start it flying immediately. */
export function applyShot(flight, shot) {
  Object.assign(flight, {
    x: shot.x,
    z: shot.z,
    alt: shot.alt,
    speed: shot.speed,
    hdg: shot.hdg,
    pitch: shot.pitch,
    roll: shot.roll,
    throttle: shot.throttle,
    fuel: shot.fuel,
    state: "flying",
  });
  return flight;
}

export function maxAlt() {
  return CONFIG.flight.maxAlt;
}

// Skyhawk Ridge Run — the flight model.
// Arcade physics with real trade-offs: throttle sets speed, pitch sets climb,
// bank turns the nose, and fuel, stall and terrain all get a vote.
import { CONFIG } from "./config.js";
import { groundHeight, nextRing, overRunway } from "./world.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const FT_PER_KT = 1.2; // world feet per second per knot (arcade scale)

/** A fresh flight, sitting on the runway threshold. */
export function newFlight() {
  return {
    state: "menu", // menu | flying | crashed | landed
    x: 0,
    z: 0,
    alt: 0,
    speed: 0,
    hdg: 0,
    pitch: 0,
    roll: 0,
    throttle: 0,
    fuel: CONFIG.fuel.start,
    verticalSpeed: 0,
    score: 0,
    ringsHit: 0,
    message: "",
    messageT: 0,
  };
}

function flash(f, text) {
  f.message = text;
  f.messageT = 2.2;
}

/** Advance the flight one step. `input` is the live input state, `rings` the course. */
export function stepFlight(f, input, rings, dt) {
  if (f.state !== "flying") return;
  const cfg = CONFIG.flight;

  if (f.messageT > 0) f.messageT -= dt;

  // Throttle and boost.
  if (input.throttleUp) f.throttle = clamp(f.throttle + 0.55 * dt, 0, 1);
  if (input.throttleDown) f.throttle = clamp(f.throttle - 0.55 * dt, 0, 1);
  const boost = input.boost && f.fuel > 0;
  const targetSpeed = f.throttle * cfg.maxSpeed + (boost ? cfg.boostThrust : 0);
  f.speed = lerp(f.speed, Math.min(targetSpeed, cfg.maxSpeed + 60), 1 - Math.exp(-0.9 * dt));
  f.speed -= f.speed * cfg.drag * 0.01 * dt * 10;
  f.speed = clamp(f.speed, 0, cfg.maxSpeed + 60);

  // Pitch and roll chase the stick.
  const pitchTarget = (input.pitchUp ? 16 : 0) + (input.pitchDown ? -20 : 0);
  const rollTarget = (input.rollLeft ? -42 : 0) + (input.rollRight ? 42 : 0);
  f.pitch = lerp(f.pitch, pitchTarget, 1 - Math.exp(-3.2 * dt));
  f.roll = lerp(f.roll, rollTarget, 1 - Math.exp(-3.2 * dt));

  // Heading follows bank; position follows heading and speed.
  f.hdg = (f.hdg - f.roll * 0.45 * dt + 360) % 360;
  const hdgRad = (f.hdg * Math.PI) / 180;
  f.x += Math.sin(hdgRad) * f.speed * FT_PER_KT * dt;
  f.z += Math.cos(hdgRad) * f.speed * FT_PER_KT * dt;
  f.x = clamp(f.x, -CONFIG.valley.halfWidth, CONFIG.valley.halfWidth);

  // Climb, sink and the stall.
  const stalled = f.speed < cfg.stallSpeed;
  const climb = Math.sin((f.pitch * Math.PI) / 180) * f.speed * FT_PER_KT;
  f.verticalSpeed = climb - (stalled ? 55 : 6);
  f.alt += f.verticalSpeed * dt;
  f.alt = clamp(f.alt, 0, cfg.maxAlt);
  if (stalled && f.alt > 120) flash(f, "STALL — NOSE DOWN, THROTTLE UP");

  // Fuel.
  f.fuel -= (f.throttle * CONFIG.fuel.burn + (boost ? CONFIG.fuel.boostBurn : 0)) * dt;
  if (f.fuel <= 0) {
    f.fuel = 0;
    f.throttle = 0;
    flash(f, "FUEL EMPTY — GLIDE TO THE RUNWAY");
  }

  // Rings left behind are missed, never pending: the course always points
  // at the next ring ahead, even when a shot starts mid-course.
  for (const r of rings) {
    if (!r.passed && r.z < f.z - 140) r.passed = true;
  }
  // Rings.
  const ring = nextRing(rings);
  if (ring && Math.abs(f.z - ring.z) < 140) {
    const dx = f.x - ring.x;
    const dy = f.alt - ring.y;
    const d = Math.hypot(dx, dy);
    if (d < CONFIG.rings.radius) {
      ring.passed = true;
      const centred = d < CONFIG.rings.centreBonus;
      ring.centred = centred;
      f.ringsHit += 1;
      f.score += CONFIG.scoring.ring + (centred ? CONFIG.scoring.centre : 0);
      flash(f, centred ? `RING DEAD CENTRE +${CONFIG.scoring.ring + CONFIG.scoring.centre}` : `RING +${CONFIG.scoring.ring}`);
    }
  }

  // Landing: slow, low and over the strip, with a forgiving flare window.
  if (overRunway(f.x, f.z) && f.alt < 45 && f.speed < 200 && f.verticalSpeed > -26) {
    f.state = "landed";
    const centreBonus = Math.max(0, 100 - Math.abs(f.x));
    f.score += CONFIG.scoring.landing + Math.round(centreBonus);
    flash(f, `LANDED +${CONFIG.scoring.landing + Math.round(centreBonus)}`);
    return;
  }

  // Terrain.
  const ground = groundHeight(f.x, f.z);
  if (f.alt <= ground + 8) {
    f.state = "crashed";
    f.message = f.alt <= 30 ? "CRASHED — INTO THE VALLEY FLOOR" : "CRASHED — INTO THE RIDGE";
    f.messageT = 99;
  }
}

// Skyhawk Ridge Run — game loop and state machine.
// Owns the canvas, the clock, and the transitions between menu, flying,
// crashed and landed. The flight model lives in physics.js, the pictures
// in render.js, the valley in world.js.
import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { newFlight, stepFlight } from "./physics.js";
import { render } from "./render.js";
import { makeRings } from "./world.js";
import { shotFromUrl, applyShot } from "./shots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;

const input = createInput(canvas);
const flight = newFlight();
let rings = makeRings();

/** Put the jet on the runway threshold, ready for a takeoff roll. */
function resetFlight() {
  const fresh = newFlight();
  Object.assign(flight, fresh, {
    state: "flying",
    x: 0,
    z: 19050,
    alt: 30,
    speed: 0,
    hdg: 0,
    pitch: 0,
    roll: 0,
    throttle: 0.25,
  });
  rings = makeRings();
}

/** Start from the menu, or restart after a crash or a landing. */
function startFlight() {
  if (flight.state === "menu") {
    flight.state = "flying";
    flight.x = 0;
    flight.z = 19050;
    flight.alt = 30;
    flight.speed = 0;
    flight.hdg = 0;
    flight.throttle = 0.25;
  } else {
    resetFlight();
  }
}

const shot = shotFromUrl();
if (shot) applyShot(flight, shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.consume("KeyR") && flight.state !== "menu") startFlight();
  if (input.consume("KeyM")) input.toggleMouseSteering();
  if (input.consume("Enter") && flight.state === "menu") startFlight();
  if (input.mouseDown && flight.state === "menu") startFlight();

  if (flight.state === "flying") {
    stepFlight(flight, input, rings, dt);
  }
  render(ctx, flight, rings, input.boost && flight.state === "flying");
  input.endFrame();

  // The maker hooks its screenshot pass on the first finished frame.
  window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

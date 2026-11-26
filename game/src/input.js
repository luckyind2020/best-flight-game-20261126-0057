// Skyhawk Ridge Run — keyboard and mouse input.
// One object holds the live state; the game loop reads it, and edge-triggered
// actions (reset, mouse-steering toggle) are consumed exactly once per press.

const HANDLED = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, steering: false, down: false };

  window.addEventListener("keydown", (e) => {
    if (HANDLED.includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => keys.clear());

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  });
  canvas.addEventListener("mousedown", () => {
    mouse.down = true;
  });
  window.addEventListener("mouseup", () => {
    mouse.down = false;
  });

  return {
    /** Pitch stick up (ArrowDown): nose up, climb. */
    get pitchUp() {
      return keys.has("ArrowDown") || (mouse.steering && mouse.y < -0.25);
    },
    /** Pitch stick down (ArrowUp): nose down, descend. */
    get pitchDown() {
      return keys.has("ArrowUp") || (mouse.steering && mouse.y > 0.25);
    },
    get rollLeft() {
      return keys.has("ArrowLeft") || (mouse.steering && mouse.x < -0.2);
    },
    get rollRight() {
      return keys.has("ArrowRight") || (mouse.steering && mouse.x > 0.2);
    },
    get throttleUp() {
      return keys.has("KeyW");
    },
    get throttleDown() {
      return keys.has("KeyS");
    },
    get boost() {
      return keys.has("Space");
    },
    get mouseDown() {
      return mouse.down;
    },
    get mouseSteering() {
      return mouse.steering;
    },
    toggleMouseSteering() {
      mouse.steering = !mouse.steering;
    },
    /** True once for a key pressed since the last frame; call once per frame. */
    consume(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    /** Drop stale edge presses at the end of each frame. */
    endFrame() {
      pressed.clear();
    },
  };
}

// Skyhawk Ridge Run — canvas rendering.
// Chase view over a procedural dawn valley: sky, ridges, ground grid, river,
// runway, golden rings, the jet, and a full lit instrument panel.
import { CONFIG, COLOURS } from "./config.js";
import { groundHeight, riverX } from "./world.js";
import { makeNoise1D } from "./random.js";

const mountainNoise = makeNoise1D(555);
const TAU = Math.PI * 2;

function horizonY(f, H) {
  return H * CONFIG.camera.horizonFrac - f.pitch * 6;
}

/** Project a world point (x, y, z) to screen space; null when behind the jet. */
function project(f, x, y, z, W, H) {
  const dz = z - f.z;
  if (dz < 40) return null;
  const s = CONFIG.camera.focal / dz;
  return {
    x: W / 2 + (x - f.x) * s,
    y: horizonY(f, H) + (f.alt - y) * s * 0.6,
    s,
  };
}

function drawSky(ctx, f, W, H) {
  const hy = horizonY(f, H);
  const grad = ctx.createLinearGradient(0, 0, 0, hy + 40);
  grad.addColorStop(0, COLOURS.skyTop);
  grad.addColorStop(0.62, COLOURS.skyMid);
  grad.addColorStop(1, COLOURS.skyHorizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, hy + 40);
  // Drifting cloud puffs, parallaxed by heading.
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  for (let i = 0; i < 6; i += 1) {
    const cx = (((i * 373 + f.z * 0.02 + f.hdg * 9) % (W + 420)) + W + 420) % (W + 420) - 210;
    const cy = 52 + ((i * 61) % 150);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 74, 15, 0, 0, TAU);
    ctx.ellipse(cx + 44, cy + 6, 52, 12, 0, 0, TAU);
    ctx.fill();
  }
}

function drawMountains(ctx, f, W, H) {
  const hy = horizonY(f, H);
  const layers = [
    { amp: 150, col: COLOURS.mountainFar, seed: 0 },
    { amp: 210, col: COLOURS.mountainMid, seed: 7 },
    { amp: 265, col: COLOURS.mountainNear, seed: 19 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.col;
    ctx.beginPath();
    ctx.moveTo(0, hy + 2);
    for (let sx = 0; sx <= W; sx += 32) {
      const n = mountainNoise(sx * 0.004 + f.hdg * 0.045 + layer.seed + f.z * 0.00002);
      const peak = layer.amp * (0.45 + 0.55 * (n * 0.5 + 0.5));
      ctx.lineTo(sx, hy - peak);
    }
    ctx.lineTo(W, hy + 2);
    ctx.closePath();
    ctx.fill();
  }
}

/** Low sun, drawn after the ridges so it sits above them, never behind. */
function drawSun(ctx, f, W, H) {
  const hy = horizonY(f, H);
  const sunX = W * 0.78 - f.hdg * 2;
  const sunY = hy - 150;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
  glow.addColorStop(0, COLOURS.sun);
  glow.addColorStop(1, "rgba(255, 217, 160, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
  ctx.fillStyle = COLOURS.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, TAU);
  ctx.fill();
}

function drawGround(ctx, f, W, H) {
  const hy = horizonY(f, H);
  ctx.fillStyle = COLOURS.groundBase;
  ctx.fillRect(0, hy, W, H - hy + 4);

  // Perspective grid: longitudinal and lateral lines on the valley floor.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 1;
  for (let gx = -2400; gx <= 2400; gx += 400) {
    ctx.beginPath();
    let started = false;
    for (let dz = 200; dz <= 6000; dz += 250) {
      const p = project(f, gx, groundHeight(gx, f.z + dz), f.z + dz, W, H);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  const z0 = Math.floor(f.z / 300) * 300;
  for (let k = 0; k < 20; k += 1) {
    const z = z0 + k * 300;
    ctx.beginPath();
    let started = false;
    for (let gx = -2600; gx <= 2600; gx += 200) {
      const p = project(f, gx, groundHeight(gx, z), z, W, H);
      if (!p) continue;
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Field patches: alternating crop colours down the valley.
  for (let k = 0; k < 14; k += 1) {
    const zc = f.z + 500 + k * 700;
    const xc = ((k * 977) % 2400) - 1200;
    const corners = [
      project(f, xc - 300, groundHeight(xc - 300, zc - 300), zc - 300, W, H),
      project(f, xc + 300, groundHeight(xc + 300, zc - 300), zc - 300, W, H),
      project(f, xc + 300, groundHeight(xc + 300, zc + 300), zc + 300, W, H),
      project(f, xc - 300, groundHeight(xc - 300, zc + 300), zc + 300, W, H),
    ];
    if (corners.some((c) => !c)) continue;
    ctx.fillStyle = k % 2 === 0 ? COLOURS.groundFieldA : COLOURS.groundFieldB;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // The river, winding down the valley.
  ctx.strokeStyle = COLOURS.river;
  ctx.lineCap = "round";
  for (let dz = 400; dz <= 6000; dz += 200) {
    const z = f.z + dz;
    const a = project(f, riverX(z) - 55, 0, z, W, H);
    const b = project(f, riverX(z + 200) - 55, 0, z + 200, W, H);
    if (!a || !b) continue;
    ctx.lineWidth = Math.max(1, Math.min(46, 110 * a.s));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // The runway: dark strip, centreline dashes, threshold bars. Drawn as a
  // ribbon from just ahead of the jet, so the strip under and ahead of the
  // aircraft always shows — even while rolling on it.
  const rw = CONFIG.runway;
  if (f.z < rw.zEnd && f.z + 6000 > rw.zStart) {
    const zFrom = Math.max(rw.zStart, f.z + 60);
    ctx.fillStyle = COLOURS.runway;
    ctx.beginPath();
    let started = false;
    for (let z = zFrom; z <= rw.zEnd; z += 150) {
      const l = project(f, -rw.halfWidth, 0, z, W, H);
      if (!l) continue;
      if (!started) {
        ctx.moveTo(l.x, l.y);
        started = true;
      } else ctx.lineTo(l.x, l.y);
    }
    for (let z = rw.zEnd; z >= zFrom; z -= 150) {
      const r = project(f, rw.halfWidth, 0, z, W, H);
      if (!r) continue;
      ctx.lineTo(r.x, r.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLOURS.runwayLine;
    ctx.lineWidth = 2;
    for (let z = Math.max(rw.zStart + 200, f.z + 200); z < rw.zEnd; z += 400) {
      const a = project(f, 0, 2, z, W, H);
      const b = project(f, 0, 2, z + 180, W, H);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

function drawRings(ctx, f, rings, W, H) {
  for (const ring of rings) {
    if (ring.passed) continue;
    const dz = ring.z - f.z;
    if (dz < 60 || dz > 9000) continue;
    const p = project(f, ring.x, ring.y, ring.z, W, H);
    if (!p) continue;
    const r = CONFIG.rings.radius * p.s;
    if (r < 2) continue;
    ctx.save();
    ctx.strokeStyle = COLOURS.ringGlow;
    ctx.lineWidth = Math.max(3, r * 0.22);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = COLOURS.ring;
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(p.x - r * 0.3, p.y - r * 0.35, Math.max(1.5, r * 0.06), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawJet(ctx, f, W, H, boost) {
  const cx = W / 2;
  const cy = H * 0.66;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-f.roll * Math.PI) / 180 * 0.55);
  ctx.translate(0, f.pitch * 0.9);
  // Afterburner flame.
  if (boost) {
    const flame = ctx.createLinearGradient(0, 46, 0, 108);
    flame.addColorStop(0, "rgba(255, 190, 60, 0.95)");
    flame.addColorStop(1, "rgba(255, 80, 20, 0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-13, 46);
    ctx.lineTo(0, 108);
    ctx.lineTo(13, 46);
    ctx.closePath();
    ctx.fill();
  }
  // Wings, swept back.
  ctx.fillStyle = COLOURS.jetDark;
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(-168, 42);
  ctx.lineTo(-158, 58);
  ctx.lineTo(-12, 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -6);
  ctx.lineTo(168, 42);
  ctx.lineTo(158, 58);
  ctx.lineTo(12, 22);
  ctx.closePath();
  ctx.fill();
  // Tailplane.
  ctx.fillStyle = COLOURS.jetDark;
  ctx.beginPath();
  ctx.moveTo(-10, 34);
  ctx.lineTo(-72, 62);
  ctx.lineTo(-64, 72);
  ctx.lineTo(-8, 48);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 34);
  ctx.lineTo(72, 62);
  ctx.lineTo(64, 72);
  ctx.lineTo(8, 48);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, COLOURS.jetDark);
  body.addColorStop(0.35, COLOURS.jetBody);
  body.addColorStop(1, COLOURS.jetDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -78);
  ctx.quadraticCurveTo(15, -40, 17, 6);
  ctx.quadraticCurveTo(18, 40, 12, 56);
  ctx.lineTo(-12, 56);
  ctx.quadraticCurveTo(-18, 40, -17, 6);
  ctx.quadraticCurveTo(-15, -40, 0, -78);
  ctx.closePath();
  ctx.fill();
  // Canopy.
  ctx.fillStyle = "#bfe3f5";
  ctx.beginPath();
  ctx.ellipse(0, -34, 8, 20, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(-2, -42, 3, 8, 0, 0, TAU);
  ctx.fill();
  // Nose accent stripe and engine nozzles.
  ctx.fillStyle = COLOURS.jetAccent;
  ctx.fillRect(-2, -58, 4, 26);
  ctx.fillStyle = "#22282e";
  ctx.beginPath();
  ctx.arc(-8, 56, 6, 0, TAU);
  ctx.arc(8, 56, 6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = f.throttle > 0.55 ? "#ffb03a" : "#5a4632";
  ctx.beginPath();
  ctx.arc(-8, 56, 3.4, 0, TAU);
  ctx.arc(8, 56, 3.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDial(ctx, x, y, r, label, value, max, unit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(8, 14, 26, 0.72)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#7fa0c8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(234, 242, 255, 0.8)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i += 1) {
    const a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.lineTo(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10));
    ctx.stroke();
  }
  const angle = -Math.PI * 0.75 + (value / max) * Math.PI * 1.5;
  ctx.strokeStyle = COLOURS.warnAmber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (r - 12), Math.sin(angle) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = "600 12px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, 0, r + 16);
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillStyle = COLOURS.hudDim;
  ctx.fillText(unit, 0, r + 30);
  ctx.restore();
}

function drawHorizon(ctx, f, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(8, 14, 26, 0.72)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r - 3, 0, TAU);
  ctx.clip();
  ctx.rotate((-f.roll * Math.PI) / 180);
  const pitchOff = f.pitch * 1.6;
  ctx.fillStyle = "#3f6fb5";
  ctx.fillRect(-r, -r + pitchOff, r * 2, r - pitchOff);
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(-r, pitchOff, r * 2, r - pitchOff + 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchOff);
  ctx.lineTo(r, pitchOff);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#7fa0c8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  // Fixed aircraft symbol.
  ctx.strokeStyle = COLOURS.warnAmber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(16, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.fillStyle = COLOURS.hudDim;
  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("ATT", 0, r + 16);
  ctx.restore();
}

function drawHud(ctx, f, rings, W, H) {
  const hy = horizonY(f, H);
  void hy;
  ctx.textAlign = "left";
  // Top bar.
  ctx.fillStyle = "rgba(8, 14, 26, 0.55)";
  ctx.fillRect(0, 0, W, 46);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = "600 17px ui-monospace, monospace";
  ctx.fillText(`ALT ${String(Math.round(f.alt)).padStart(4, "0")} FT`, 18, 30);
  ctx.fillText(`SPD ${String(Math.round(f.speed)).padStart(3, "0")} KT`, 220, 30);
  ctx.fillText(`HDG ${String(Math.round(f.hdg)).padStart(3, "0")}°`, 400, 30);
  // Compass tape.
  ctx.save();
  ctx.translate(W / 2, 30);
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "center";
  for (let d = -60; d <= 60; d += 15) {
    const h = (Math.round(f.hdg) + d + 360) % 360;
    const x = d * 3.2;
    ctx.strokeStyle = "rgba(234, 242, 255, 0.6)";
    ctx.beginPath();
    ctx.moveTo(x, -12);
    ctx.lineTo(x, d % 45 === 0 ? 2 : -4);
    ctx.stroke();
    if (d % 45 === 0) {
      const label = h === 0 ? "N" : h === 90 ? "E" : h === 180 ? "S" : h === 270 ? "W" : String(h).padStart(3, "0");
      ctx.fillStyle = COLOURS.hudText;
      ctx.fillText(label, x, 16);
    }
  }
  ctx.restore();
  // Score block, top right.
  ctx.textAlign = "right";
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = "600 17px ui-monospace, monospace";
  ctx.fillText(`SCORE ${f.score}`, W - 18, 30);
  ctx.font = "13px ui-monospace, monospace";
  ctx.fillStyle = COLOURS.hudDim;
  ctx.fillText(`RINGS ${f.ringsHit}/${rings.length}   FUEL ${Math.round(f.fuel)}%`, W - 18, 62);
  // Pitch ladder, centre.
  ctx.save();
  ctx.translate(W / 2, H * 0.42);
  ctx.strokeStyle = "rgba(234, 242, 255, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "left";
  for (const deg of [-20, -10, 10, 20]) {
    const y = -deg * 2.4 - f.pitch * 2.4;
    if (Math.abs(y) > 130) continue;
    ctx.beginPath();
    ctx.moveTo(-34, y);
    ctx.lineTo(34, y);
    ctx.stroke();
    ctx.fillStyle = COLOURS.hudText;
    ctx.fillText(String(Math.abs(deg)), 40, y + 4);
  }
  // Flight-path marker.
  ctx.strokeStyle = COLOURS.ring;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -f.pitch * 2.4, 9, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, -f.pitch * 2.4);
  ctx.lineTo(-9, -f.pitch * 2.4);
  ctx.moveTo(9, -f.pitch * 2.4);
  ctx.lineTo(20, -f.pitch * 2.4);
  ctx.stroke();
  ctx.restore();
  // Warnings.
  const warnings = [];
  if (f.state === "flying" && f.speed < CONFIG.flight.stallSpeed && f.alt > 120) warnings.push("STALL");
  if (f.state === "flying" && f.alt < 160 && f.verticalSpeed < -8) warnings.push("PULL UP");
  if (f.state === "flying" && f.fuel < 20) warnings.push("LOW FUEL");
  if (warnings.length > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = COLOURS.warnRed;
    ctx.font = "700 22px ui-monospace, monospace";
    ctx.fillText(warnings.join("  •  "), W / 2, 96);
  }
  // Flash message.
  if (f.messageT > 0 && f.message) {
    ctx.textAlign = "center";
    ctx.fillStyle = f.message.startsWith("CRASHED") ? COLOURS.warnRed : COLOURS.ring;
    ctx.font = "700 26px ui-monospace, monospace";
    ctx.fillText(f.message, W / 2, H * 0.24);
  }
  // Instruments, bottom left.
  drawHorizon(ctx, f, 108, H - 108, 58);
  drawDial(ctx, 216, H - 88, 44, "ALT", f.alt % 1000, 1000, "x1000 FT");
  drawDial(ctx, 306, H - 88, 44, "SPD", f.speed, 400, "KNOTS");
  // Throttle + fuel, bottom right.
  const tx = W - 92;
  const ty = H - 200;
  ctx.fillStyle = "rgba(8, 14, 26, 0.72)";
  ctx.fillRect(tx - 16, ty - 12, 62, 150);
  ctx.fillStyle = "#274b63";
  ctx.fillRect(tx, ty, 18, 118);
  const th = f.throttle * 118;
  ctx.fillStyle = f.throttle > 0.85 ? COLOURS.warnAmber : "#69b7ff";
  ctx.fillRect(tx, ty + 118 - th, 18, th);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = "11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("THR", tx + 9, ty + 134);
  ctx.fillStyle = f.fuel < 20 ? COLOURS.warnRed : "#69d17a";
  ctx.fillRect(tx - 16, ty + 148 - 8, 62 * (f.fuel / 100), 8);
  ctx.fillStyle = COLOURS.hudDim;
  ctx.fillText("FUEL", tx + 15, ty + 152);
}

function drawOverlay(ctx, f, W, H) {
  if (f.state === "flying") return;
  ctx.fillStyle = "rgba(6, 10, 20, 0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = COLOURS.hudText;
  if (f.state === "menu") {
    ctx.font = "700 54px ui-monospace, monospace";
    ctx.fillText("SKYHAWK RIDGE RUN", W / 2, H * 0.3);
    ctx.font = "18px ui-monospace, monospace";
    ctx.fillStyle = COLOURS.hudDim;
    ctx.fillText("Thread the rings. Mind the ridges. Land the runway.", W / 2, H * 0.3 + 36);
    ctx.font = "16px ui-monospace, monospace";
    ctx.fillStyle = COLOURS.hudText;
    const lines = [
      "Arrows — pitch & bank      W / S — throttle      Space — afterburner",
      "R — reset flight      M — mouse steering",
      "",
      "CLICK OR PRESS ENTER TO FLY",
    ];
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.48 + i * 30));
  } else if (f.state === "crashed") {
    ctx.font = "700 46px ui-monospace, monospace";
    ctx.fillStyle = COLOURS.warnRed;
    ctx.fillText("CRASHED", W / 2, H * 0.36);
    ctx.font = "18px ui-monospace, monospace";
    ctx.fillStyle = COLOURS.hudText;
    ctx.fillText(`Score ${f.score}  •  Rings ${f.ringsHit}  •  Press R to fly again`, W / 2, H * 0.36 + 40);
  } else if (f.state === "landed") {
    ctx.font = "700 46px ui-monospace, monospace";
    ctx.fillStyle = COLOURS.ring;
    ctx.fillText("LANDED — WELCOME HOME", W / 2, H * 0.36);
    ctx.font = "18px ui-monospace, monospace";
    ctx.fillStyle = COLOURS.hudText;
    ctx.fillText(`Score ${f.score}  •  Rings ${f.ringsHit}  •  Press R to fly again`, W / 2, H * 0.36 + 40);
  }
}

/** Draw one frame of the game. */
export function render(ctx, f, rings, boost) {
  const W = CONFIG.canvas.width;
  const H = CONFIG.canvas.height;
  ctx.clearRect(0, 0, W, H);
  // The world banks with the jet; the HUD and jet stay level.
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate((-f.roll * Math.PI) / 180 * 0.45);
  ctx.translate(-W / 2, -H / 2);
  drawSky(ctx, f, W, H);
  drawMountains(ctx, f, W, H);
  drawSun(ctx, f, W, H);
  drawGround(ctx, f, W, H);
  drawRings(ctx, f, rings, W, H);
  ctx.restore();
  drawJet(ctx, f, W, H, boost);
  drawHud(ctx, f, rings, W, H);
  drawOverlay(ctx, f, W, H);
}

// Skyhawk Ridge Run — tuning constants.
// One place for every number the flight model, the world and the renderer
// agree on, so a tweak here retunes the whole game at once.
export const CONFIG = {
  canvas: { width: 1280, height: 800 },
  valley: { halfWidth: 2600, ridgeStart: 1700, ridgeHeight: 2400 },
  runway: { zStart: 19000, zEnd: 21400, halfWidth: 150 },
  flight: {
    maxSpeed: 380,
    stallSpeed: 90,
    cruiseSpeed: 260,
    maxAlt: 3200,
    climbRate: 26,
    turnRate: 42,
    throttleAccel: 55,
    drag: 0.12,
    boostThrust: 90,
  },
  fuel: { start: 100, burn: 0.55, boostBurn: 6 },
  rings: { count: 10, spacing: 1800, firstZ: 2000, radius: 220, centreBonus: 80 },
  scoring: { ring: 100, centre: 25, landing: 500 },
  camera: { focal: 520, horizonFrac: 0.42 },
};

export const COLOURS = {
  skyTop: "#1b2a52",
  skyMid: "#4a5f9e",
  skyHorizon: "#e8955a",
  sun: "#ffd9a0",
  mountainFar: "#5d6f9e",
  mountainMid: "#46587f",
  mountainNear: "#33415f",
  groundBase: "#3d5a34",
  groundFieldA: "#55703a",
  groundFieldB: "#6d7f3e",
  river: "#4f7fa8",
  runway: "#3a3f46",
  runwayLine: "#e8e8d8",
  ring: "#ffc93c",
  ringGlow: "rgba(255, 201, 60, 0.35)",
  hudText: "#eaf2ff",
  hudDim: "#9fb4d8",
  warnAmber: "#ffb020",
  warnRed: "#ff4d3d",
  jetBody: "#c8d2de",
  jetDark: "#5a6b7d",
  jetAccent: "#e8542f",
};

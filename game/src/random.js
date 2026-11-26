// Skyhawk Ridge Run — seeded randomness.
// The valley is procedural but deterministic: the same seed always grows the
// same ridges, so every screenshot of a scene can be reproduced exactly.

/** mulberry32: a tiny fast seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Smooth 1D value noise in [-1, 1], built from a seeded lattice with
 * cosine interpolation. Cheap, repeatable, and good enough for ridges.
 */
export function makeNoise1D(seed) {
  const rand = mulberry32(seed);
  const size = 256;
  const lattice = new Float32Array(size + 1);
  for (let i = 0; i <= size; i += 1) lattice[i] = rand() * 2 - 1;
  const fade = (t) => (1 - Math.cos(t * Math.PI)) / 2;
  return function noise(x) {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = lattice[((xi % size) + size) % size];
    const b = lattice[(((xi + 1) % size) + size) % size];
    return a + (b - a) * fade(xf);
  };
}

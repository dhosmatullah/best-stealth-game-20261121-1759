// A tiny seeded random source (mulberry32), so a ?seed=N run of the game is
// the same run every time: the screenshot scenes and the self-test rely on it.

/** Return a function that yields the next pseudo-random number in [0, 1). */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max) from `next`. */
export function randomRange(next, min, max) {
  return min + next() * (max - min);
}

/** A random integer in [min, max] from `next`. */
export function randomInt(next, min, max) {
  return min + Math.floor(next() * (max - min + 1));
}

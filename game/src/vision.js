// Line of sight and vision cones: what a warden can actually see, given the
// walls between it and the thief. Bushes never block sight, but the world
// treats a thief crouched inside one as far harder to spot.
import { COLS, ROWS, TILE } from './config.js';

/** The tile character at pixel (x, y); anything outside the map is a wall. */
export function tileAt(grid, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return grid[ty][tx];
}

export function isWall(grid, x, y) {
  return tileAt(grid, x, y) === '#';
}

/**
 * True when no wall stands between the two points. Samples the line every
 * few pixels, which is cheap and never lets a thin wall slip through.
 */
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isWall(grid, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

/** Distance from (x, y) along `angle` until a wall, at most `maxDistance`. */
export function raycast(grid, x, y, angle, maxDistance) {
  const step = 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d <= maxDistance; d += step) {
    if (isWall(grid, x + cos * d, y + sin * d)) return d;
  }
  return maxDistance;
}

/** The smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * The centre of tile (tx, ty) in pixels. Wardens walk between tile centres;
 * the thief's spawn and the objective tiles are read the same way.
 */
export function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

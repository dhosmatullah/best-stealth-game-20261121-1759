// The thief: three postures, a circle that slides along walls, and the
// pebbles it can throw to pull a warden away from its route.
import { PLAYER, NOISE, TILE } from './config.js';
import { isWall, tileAt } from './vision.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    angle: 0,
    posture: 'walk',
    pebbles: PLAYER.pebbles,
    stepTimer: 0,
    moving: false,
  };
}

/** True when a circle of the thief's radius fits at (x, y). */
function fits(grid, x, y) {
  const r = PLAYER.radius;
  return !isWall(grid, x - r, y - r) && !isWall(grid, x + r, y - r)
    && !isWall(grid, x - r, y + r) && !isWall(grid, x + r, y + r);
}

/**
 * Move the thief one step from a held direction. Axes are resolved one at a
 * time, so the thief slides along a wall instead of sticking to it. Returns
 * a noise event when the feet make one: { x, y, radius } or null.
 */
export function updatePlayer(player, grid, dt, input) {
  const speed = player.posture === 'sneak' ? PLAYER.sneakSpeed
    : player.posture === 'run' ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const dx = input.x;
  const dy = input.y;
  const length = Math.hypot(dx, dy);
  player.moving = length > 0;
  let noise = null;
  if (length > 0) {
    const nx = dx / length;
    const ny = dy / length;
    const stepX = nx * speed * dt;
    const stepY = ny * speed * dt;
    if (fits(grid, player.x + stepX, player.y)) player.x += stepX;
    if (fits(grid, player.x, player.y + stepY)) player.y += stepY;
    player.angle = Math.atan2(ny, nx);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = NOISE.stepInterval;
      const tile = tileAt(grid, player.x, player.y);
      if (player.posture === 'run') {
        noise = { x: player.x, y: player.y, radius: NOISE.runRadius, kind: 'run' };
      } else if (tile === ',') {
        noise = { x: player.x, y: player.y, radius: NOISE.gravelRadius, kind: 'gravel' };
      }
    }
  } else {
    player.stepTimer = 0;
  }
  return noise;
}

/**
 * Start a pebble's flight toward (tx, ty) in pixels. The world animates the
 * throw and rings the noise when it lands; this only spends the pebble.
 */
export function throwPebble(player, tx, ty) {
  if (player.pebbles <= 0) return null;
  player.pebbles -= 1;
  return {
    fromX: player.x,
    fromY: player.y,
    toX: tx,
    toY: ty,
    t: 0,
    duration: 0.35,
  };
}

/** The thief's tile, for light, cover and objective checks. */
export function playerTile(player) {
  return { tx: Math.floor(player.x / TILE), ty: Math.floor(player.y / TILE) };
}

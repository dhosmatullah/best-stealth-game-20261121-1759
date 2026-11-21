// The wardens: patrol, pause and scan, investigate a sound, chase a thief
// they can see, search the last place they saw one, then return to patrol.
// Each warden keeps its own detection meter; the highest meter is the one
// the HUD shows, and a full meter is what raises the alarm.
import { COLS, ROWS, TILE, GUARD, DETECTION } from './config.js';
import { angleDifference, hasLineOfSight, tileAt, tileCentre } from './vision.js';
import { randomRange } from './random.js';

export const STATE_PATROL = 'patrol';
export const STATE_SCAN = 'scan';
export const STATE_INVESTIGATE = 'investigate';
export const STATE_CHASE = 'chase';
export const STATE_SEARCH = 'search';
export const STATE_RETURN = 'return';

/** Breadth-first path over walkable tiles, as a list of tile centres. */
export function findPath(grid, fromTx, fromTy, toTx, toTy) {
  if (toTx < 0 || toTy < 0 || toTx >= COLS || toTy >= ROWS) return [];
  if (grid[toTy][toTx] === '#') return [];
  const key = (x, y) => y * COLS + x;
  const cameFrom = new Map();
  const queue = [[fromTx, fromTy]];
  cameFrom.set(key(fromTx, fromTy), null);
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === toTx && y === toTy) break;
    const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let i = 0; i < neighbours.length; i += 1) {
      const [nx, ny] = neighbours[i];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (grid[ny][nx] === '#') continue;
      if (cameFrom.has(key(nx, ny))) continue;
      cameFrom.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  if (!cameFrom.has(key(toTx, toTy))) return [];
  const tiles = [];
  let at = [toTx, toTy];
  while (at !== null) {
    tiles.push(at);
    at = cameFrom.get(key(at[0], at[1]));
  }
  tiles.reverse();
  return tiles.map(([tx, ty]) => tileCentre(tx, ty));
}

export function createGuard(waypoints, nextRandom) {
  const start = tileCentre(waypoints[0][0], waypoints[0][1]);
  const second = tileCentre(waypoints[1][0], waypoints[1][1]);
  return {
    x: start.x,
    y: start.y,
    angle: Math.atan2(second.y - start.y, second.x - start.x),
    waypoints,
    waypointIndex: 1,
    state: STATE_PATROL,
    alert: 0,
    stateTimer: 0,
    scanDirection: 1,
    scanBase: 0,
    path: [],
    pathTarget: null,
    repathTimer: 0,
    loseTimer: 0,
    lastSeen: null,
    investigateTarget: null,
    stepTimer: randomRange(nextRandom, 0, 0.5),
    // A slow, seeded wobble so two wardens never scan in perfect lockstep.
    scanWobble: randomRange(nextRandom, 0.6, 1.4),
  };
}

/** How clearly this warden sees the thief right now, 0 when it cannot. */
export function guardSeesPlayer(guard, player, grid) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  const range = GUARD.sightRange * TILE;
  if (distance > range) return 0;
  const angleTo = Math.atan2(dy, dx);
  if (angleDifference(angleTo, guard.angle) > GUARD.halfAngle) return 0;
  if (!hasLineOfSight(grid, guard.x, guard.y, player.x, player.y)) return 0;
  // Nearer is clearer; a thief in a planter is barely a shape at all.
  const closeness = 1 - (distance / range) * 0.5;
  const tile = tileAt(grid, player.x, player.y);
  const cover = tile === '"' ? DETECTION.bush : tile === 'L' ? DETECTION.lit : DETECTION.shadow;
  const posture = player.posture === 'sneak' ? DETECTION.sneak : player.posture === 'run' ? DETECTION.run : 1;
  return closeness * cover * posture;
}

function moveAlongPath(guard, speed, dt) {
  if (guard.path.length === 0) return true;
  const target = guard.path[0];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  const step = speed * dt;
  if (distance <= Math.max(step, 3)) {
    guard.x = target.x;
    guard.y = target.y;
    guard.path.shift();
    return guard.path.length === 0;
  }
  guard.x += (dx / distance) * step;
  guard.y += (dy / distance) * step;
  guard.angle = Math.atan2(dy, dx);
  return false;
}

function setPath(guard, grid, tx, ty) {
  const fromTx = Math.floor(guard.x / TILE);
  const fromTy = Math.floor(guard.y / TILE);
  guard.path = findPath(grid, fromTx, fromTy, tx, ty);
  guard.pathTarget = { tx, ty };
}

function nearestWaypointIndex(guard) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < guard.waypoints.length; i += 1) {
    const centre = tileCentre(guard.waypoints[i][0], guard.waypoints[i][1]);
    const d = Math.hypot(centre.x - guard.x, centre.y - guard.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

/**
 * Advance one warden a step. Returns a small event word: 'alarm' the first
 * time its meter fills, 'step' when a footstep should sound, else ''.
 */
export function updateGuard(guard, world, dt) {
  const { grid, player } = world;
  // On the title screen the thief is hidden: wardens patrol, none chase.
  const seen = world.playerHidden ? 0 : guardSeesPlayer(guard, player, grid);
  let event = '';

  if (seen > 0) {
    guard.alert = Math.min(1, guard.alert + DETECTION.base * seen * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseTimer = 0;
    if (guard.alert >= 1 && guard.state !== STATE_CHASE) {
      guard.state = STATE_CHASE;
      guard.path = [];
      event = 'alarm';
    }
  } else {
    guard.alert = Math.max(0, guard.alert - DETECTION.drain * dt);
    if (guard.state === STATE_CHASE) {
      guard.loseTimer += dt;
      if (guard.loseTimer >= GUARD.loseSightSeconds) {
        guard.state = STATE_SEARCH;
        guard.stateTimer = GUARD.searchSeconds;
        if (guard.lastSeen) {
          setPath(guard, grid, Math.floor(guard.lastSeen.x / TILE), Math.floor(guard.lastSeen.y / TILE));
        }
      }
    }
  }

  // Footsteps: a short timer per stride, so the audio layer can place them.
  guard.stepTimer -= dt;
  const moving = guard.state === STATE_PATROL || guard.state === STATE_INVESTIGATE
    || guard.state === STATE_CHASE || guard.state === STATE_RETURN;
  if (moving && guard.stepTimer <= 0) {
    const speed = guard.state === STATE_CHASE ? GUARD.chaseSpeed : guard.state === STATE_PATROL ? GUARD.patrolSpeed : GUARD.investigateSpeed;
    guard.stepTimer = (TILE * 0.9) / speed;
    event = event || 'step';
  }

  if (guard.state === STATE_PATROL) {
    const target = tileCentre(guard.waypoints[guard.waypointIndex][0], guard.waypoints[guard.waypointIndex][1]);
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const distance = Math.hypot(dx, dy);
    const step = GUARD.patrolSpeed * dt;
    if (distance <= Math.max(step, 3)) {
      guard.x = target.x;
      guard.y = target.y;
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.state = STATE_SCAN;
      guard.stateTimer = randomRange(world.nextRandom, 1.1, 2.1) * guard.scanWobble;
      guard.scanBase = guard.angle;
      guard.scanDirection = world.nextRandom() < 0.5 ? 1 : -1;
    } else {
      guard.x += (dx / distance) * step;
      guard.y += (dy / distance) * step;
      guard.angle = Math.atan2(dy, dx);
    }
  } else if (guard.state === STATE_SCAN) {
    guard.stateTimer -= dt;
    // Sweep the cone slowly around the direction it arrived facing.
    guard.angle = guard.scanBase + Math.sin((1 - Math.max(guard.stateTimer, 0)) * 1.4) * 0.9 * guard.scanDirection;
    if (guard.stateTimer <= 0) guard.state = STATE_PATROL;
  } else if (guard.state === STATE_INVESTIGATE) {
    if (guard.path.length === 0) {
      guard.state = STATE_SCAN;
      guard.stateTimer = 2.2;
      guard.scanBase = guard.angle;
      guard.scanDirection = 1;
    } else if (moveAlongPath(guard, GUARD.investigateSpeed, dt)) {
      guard.state = STATE_SCAN;
      guard.stateTimer = 2.2;
      guard.scanBase = guard.angle;
      guard.scanDirection = 1;
    }
  } else if (guard.state === STATE_CHASE) {
    guard.repathTimer -= dt;
    if (guard.repathTimer <= 0) {
      guard.repathTimer = 0.4;
      setPath(guard, grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    }
    moveAlongPath(guard, GUARD.chaseSpeed, dt);
  } else if (guard.state === STATE_SEARCH) {
    if (guard.path.length > 0) {
      moveAlongPath(guard, GUARD.investigateSpeed, dt);
    } else {
      guard.stateTimer -= dt;
      guard.angle += dt * 1.6;
      if (guard.stateTimer <= 0) {
        guard.state = STATE_RETURN;
        const index = nearestWaypointIndex(guard);
        setPath(guard, grid, guard.waypoints[index][0], guard.waypoints[index][1]);
        guard.waypointIndex = index;
      }
    }
  } else if (guard.state === STATE_RETURN) {
    if (guard.path.length === 0 || moveAlongPath(guard, GUARD.returnSpeed, dt)) {
      guard.state = STATE_PATROL;
    }
  }
  return event;
}

/** Send a warden to look at a noise: only one that is not already chasing. */
export function guardHearsNoise(guard, grid, x, y, radius) {
  if (guard.state === STATE_CHASE) return;
  const distance = Math.hypot(x - guard.x, y - guard.y);
  if (distance > radius) return;
  guard.investigateTarget = { x, y };
  guard.state = STATE_INVESTIGATE;
  setPath(guard, grid, Math.floor(x / TILE), Math.floor(y / TILE));
}

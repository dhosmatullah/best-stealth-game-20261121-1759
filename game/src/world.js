// The world: three floors of the Harrowgate Museum, the thief, its wardens,
// and everything the two do to each other. One fixed step at a time, so a
// screenshot scene replayed from a seed is the same scene every time.
import { COLS, ROWS, TILE, SCORE, NOISE } from './config.js';
import { LEVELS } from './levels.js';
import { createRandom } from './random.js';
import { createGuard, updateGuard, guardHearsNoise, STATE_CHASE } from './guards.js';
import { createPlayer, updatePlayer, throwPebble } from './player.js';
import { tileCentre } from './vision.js';

export const EVENT_PICKUP = 1;
export const EVENT_COIN = 2;
export const EVENT_ALARM = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_FLOOR = 16;
export const EVENT_WIN = 32;
export const EVENT_KEY = 64;
export const EVENT_PEBBLE = 128;
export const EVENT_UNLOCK = 256;

/** Read the level's map into the pieces the rules need. */
function parseLevel(level) {
  const grid = level.map.map((row) => row.split(''));
  const found = { start: null, key: null, stairs: null, exit: null, sapphire: null, coins: [] };
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const ch = grid[y][x];
      if (ch === 'S') found.start = { x, y };
      else if (ch === 'K') found.key = { x, y };
      else if (ch === '>') found.stairs = { x, y };
      else if (ch === 'E') found.exit = { x, y };
      else if (ch === 'V') found.sapphire = { x, y };
      else if (ch === 'C') found.coins.push({ x, y, taken: false });
    }
  }
  return { grid, found };
}

export function createWorld(random) {
  const world = {
    nextRandom: random,
    floorIndex: 0,
    grid: [],
    player: null,
    guards: [],
    coins: [],
    key: null,
    keyTaken: false,
    stairs: null,
    exit: null,
    sapphire: null,
    sapphireTaken: false,
    time: 0,
    score: 0,
    coinsCollected: 0,
    alarms: 0,
    caught: false,
    won: false,
    rank: '',
    pebble: null,
    noiseRings: [],
    guardSteps: [],
    playerHidden: false,
  };
  world.loadFloor = function loadFloor(index, keepScore) {
    const level = LEVELS[index];
    const { grid, found } = parseLevel(level);
    world.floorIndex = index;
    world.grid = grid;
    const start = tileCentre(found.start.x, found.start.y);
    world.player = createPlayer(start.x, start.y);
    if (keepScore && world.playerPebblesKept !== undefined) {
      world.player.pebbles = world.playerPebblesKept;
    }
    world.guards = level.patrols.map((waypoints) => createGuard(waypoints, world.nextRandom));
    world.coins = found.coins;
    world.key = found.key;
    world.keyTaken = false;
    world.stairs = found.stairs;
    world.exit = found.exit;
    world.sapphire = found.sapphire;
    world.sapphireTaken = false;
    world.pebble = null;
    world.noiseRings = [];
    world.guardSteps = [];
    world.playerHidden = false;
  };
  world.reset = function reset() {
    world.time = 0;
    world.score = 0;
    world.coinsCollected = 0;
    world.alarms = 0;
    world.caught = false;
    world.won = false;
    world.rank = '';
    world.playerPebblesKept = undefined;
    world.loadFloor(0, false);
  };
  world.nextFloor = function nextFloor() {
    world.playerPebblesKept = Math.min(9, world.player.pebbles + 2);
    world.score += SCORE.floorBonus;
    world.loadFloor(world.floorIndex + 1, true);
    world.player.pebbles = world.playerPebblesKept;
  };
  world.maxAlert = function maxAlert() {
    let top = 0;
    for (let i = 0; i < world.guards.length; i += 1) {
      if (world.guards[i].alert > top) top = world.guards[i].alert;
    }
    return top;
  };
  world.alarmActive = function alarmActive() {
    return world.guards.some((guard) => guard.state === STATE_CHASE);
  };
  world.objective = function objective() {
    if (world.floorIndex === 0) return world.keyTaken ? 'Key taken — reach the stairs ↓' : 'Steal the Brass Key';
    if (world.floorIndex === 1) return world.keyTaken ? 'Key taken — reach the stairs ↓' : 'Steal the Silver Key';
    if (!world.sapphireTaken) return 'Steal the Moon Sapphire';
    return 'Sapphire taken — reach the EXIT!';
  };
  world.rankFor = function rankFor() {
    if (world.alarms === 0) return 'GHOST';
    if (world.alarms <= 2) return 'SHADOW';
    return 'BRASS';
  };
  world.step = function step(dt, input) {
    let events = 0;
    if (world.caught || world.won) return events;
    world.guardSteps = [];
    const attract = Boolean(input.attract);

    if (!attract) {
      world.time += dt;
      world.player.posture = input.posture || 'walk';
      const noise = updatePlayer(world.player, world.grid, dt, { x: input.x || 0, y: input.y || 0 });
      if (noise) {
        world.noiseRings.push({ x: noise.x, y: noise.y, radius: noise.radius, ttl: 0.7, maxTtl: 0.7 });
        for (let i = 0; i < world.guards.length; i += 1) {
          guardHearsNoise(world.guards[i], world.grid, noise.x, noise.y, noise.radius);
        }
      }
      if (input.throwAt) {
        const thrown = throwPebble(world.player, input.throwAt.x, input.throwAt.y);
        if (thrown) world.pebble = thrown;
      }
    }

    if (world.pebble) {
      world.pebble.t += dt / world.pebble.duration;
      if (world.pebble.t >= 1) {
        const landed = world.pebble;
        world.pebble = null;
        world.noiseRings.push({ x: landed.toX, y: landed.toY, radius: NOISE.pebbleRadius, ttl: 0.8, maxTtl: 0.8 });
        for (let i = 0; i < world.guards.length; i += 1) {
          guardHearsNoise(world.guards[i], world.grid, landed.toX, landed.toY, NOISE.pebbleRadius);
        }
        events |= EVENT_PEBBLE;
      }
    }

    for (let i = 0; i < world.noiseRings.length; i += 1) world.noiseRings[i].ttl -= dt;
    world.noiseRings = world.noiseRings.filter((ring) => ring.ttl > 0);

    for (let i = 0; i < world.guards.length; i += 1) {
      const guard = world.guards[i];
      const event = updateGuard(guard, world, dt);
      if (event === 'alarm') {
        world.alarms += 1;
        events |= EVENT_ALARM;
      } else if (event === 'step') {
        world.guardSteps.push({ x: guard.x, y: guard.y });
      }
    }

    if (!attract) {
      const player = world.player;
      for (let i = 0; i < world.coins.length; i += 1) {
        const coin = world.coins[i];
        if (coin.taken) continue;
        const centre = tileCentre(coin.x, coin.y);
        if (Math.hypot(centre.x - player.x, centre.y - player.y) < 24) {
          coin.taken = true;
          world.coinsCollected += 1;
          world.score += SCORE.coin;
          events |= EVENT_COIN;
        }
      }
      if (world.key && !world.keyTaken) {
        const centre = tileCentre(world.key.x, world.key.y);
        if (Math.hypot(centre.x - player.x, centre.y - player.y) < 26) {
          world.keyTaken = true;
          world.score += SCORE.coin;
          events |= EVENT_KEY;
        }
      }
      if (world.sapphire && !world.sapphireTaken) {
        const centre = tileCentre(world.sapphire.x, world.sapphire.y);
        if (Math.hypot(centre.x - player.x, centre.y - player.y) < 28) {
          world.sapphireTaken = true;
          world.score += SCORE.sapphire;
          events |= EVENT_UNLOCK;
        }
      }
      const ptx = Math.floor(player.x / TILE);
      const pty = Math.floor(player.y / TILE);
      if (world.stairs && ptx === world.stairs.x && pty === world.stairs.y && world.keyTaken) {
        events |= EVENT_FLOOR;
      }
      if (world.exit && ptx === world.exit.x && pty === world.exit.y && world.sapphireTaken) {
        world.won = true;
        world.rank = world.rankFor();
        const timeBonus = Math.max(0, Math.floor((SCORE.parSeconds - world.time) * SCORE.timeBonusPerSecond));
        world.score += timeBonus;
        events |= EVENT_WIN;
      }
      for (let i = 0; i < world.guards.length; i += 1) {
        const guard = world.guards[i];
        if (guard.state === STATE_CHASE && Math.hypot(guard.x - player.x, guard.y - player.y) < 26) {
          world.caught = true;
          events |= EVENT_CAUGHT;
          break;
        }
      }
    }
    return events;
  };
  world.reset();
  return world;
}

/** A fresh world from a seed, the way main.js builds one. */
export function createWorldFromSeed(seed) {
  return createWorld(createRandom(seed));
}

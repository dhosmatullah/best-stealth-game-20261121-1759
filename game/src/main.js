// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, caught and won.
//
// ?seed=N fixes the wardens' jitter. ?shot=cover|shadow|alarm|vault (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot. ?selftest=1 runs a scripted
// headless play-through and reports it in the document title.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorldFromSeed } from './world.js';
import {
  EVENT_ALARM,
  EVENT_CAUGHT,
  EVENT_COIN,
  EVENT_FLOOR,
  EVENT_KEY,
  EVENT_PEBBLE,
  EVENT_UNLOCK,
  EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import { findPath } from './guards.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorldFromSeed(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return window.localStorage.getItem(BEST_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, value);
  } catch {
    // Storage can be off (private windows): the best rank lasts this visit only.
  }
}

function playGuardSteps() {
  for (let i = 0; i < world.guardSteps.length; i += 1) {
    const step = world.guardSteps[i];
    audio.guardStep(Math.hypot(step.x - world.player.x, step.y - world.player.y));
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.title = 'SHOT_READY';
    }
  }
  requestAnimationFrame(paint);
}

/**
 * A scripted play-through with no input device: walk the thief across the
 * lobby, throw a pebble, steal the key and take the stairs, and check the
 * rules held at every step. Reports PASS or the first failure in the title,
 * so a headless run can read it without a console.
 */
function runSelfTest() {
  const failures = [];
  const check = (name, ok) => {
    if (!ok) failures.push(name);
  };
  try {
    const stepWorld = (move, seconds) => {
      const steps = Math.floor(seconds / STEP);
      let events = 0;
      for (let i = 0; i < steps; i += 1) events |= world.step(STEP, move);
      return events;
    };
    const walkTo = (tx, ty, seconds) => {
      // Follow the wardens' own breadth-first path, sneaking, one tile
      // centre at a time; bail out the moment a warden catches the thief.
      const fromTx = Math.floor(world.player.x / 32);
      const fromTy = Math.floor(world.player.y / 32);
      const path = findPath(world.grid, fromTx, fromTy, tx, ty);
      if (path.length === 0) return false;
      const maxSteps = Math.floor(60 * seconds);
      let guard = 0;
      for (let i = 0; i < path.length && guard < maxSteps && !world.caught; i += 1) {
        const target = path[i];
        while (guard < maxSteps && !world.caught) {
          const dx = target.x - world.player.x;
          const dy = target.y - world.player.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 10) break;
          // Steer straight at the tile centre (diagonal included) so the
          // thief stays centred through one-tile gaps instead of clipping
          // the wall above the gap with a corner.
          world.step(STEP, { x: dx / distance, y: dy / distance, posture: 'sneak', throwAt: null });
          guard += 1;
        }
      }
      const target = { x: tx * 32 + 16, y: ty * 32 + 16 };
      return Math.hypot(target.x - world.player.x, target.y - world.player.y) < 20;
    };

    check('starts on floor 1', world.floorIndex === 0);
    check('two wardens on floor 1', world.guards.length === 2);
    check('key present', world.key !== null);
    check('stairs present', world.stairs !== null);
    check('five coins on floor 1', world.coins.length === 5);
    // The wardens patrol even with no input.
    const guard0 = world.guards[0];
    const gx0 = guard0.x;
    const gy0 = guard0.y;
    stepWorld({ x: 0, y: 0, posture: 'walk', throwAt: null }, 3);
    check('warden patrols', Math.hypot(guard0.x - gx0, guard0.y - gy0) > 30);
    check('no alarm while hidden', world.alarms === 0);
    // A pebble spends one and rings a noise: throw once, then let it land.
    const pebblesBefore = world.player.pebbles;
    world.step(STEP, { x: 0, y: 0, posture: 'walk', throwAt: { x: 400, y: 200 } });
    stepWorld({ x: 0, y: 0, posture: 'walk', throwAt: null }, 0.6);
    check('pebble spent', world.player.pebbles === pebblesBefore - 1);
    check('pebble landed a noise', world.noiseRings.length > 0 || world.pebble === null);
    // Walk the lobby: down the west hall, through the gap, into the key
    // case, and take the Brass Key.
    check('reached the east gap', walkTo(19, 5, 20) || walkTo(18, 5, 20));
    check('reached the Brass Key', walkTo(world.key.x, world.key.y, 20));
    const keyEvents = stepWorld({ x: 0, y: 0, posture: 'walk', throwAt: null }, 0.2);
    check('key taken', world.keyTaken);
    void keyEvents;
    check('reached the stairs', walkTo(world.stairs.x, world.stairs.y, 25));
    const floorEvents = world.step(STEP, { x: 0, y: 0, posture: 'walk', throwAt: null });
    check('stairs open with key', (floorEvents & EVENT_FLOOR) !== 0);
    if ((floorEvents & EVENT_FLOOR) !== 0) world.nextFloor();
    check('now on floor 2', world.floorIndex === 1);
    check('three wardens on floor 2', world.guards.length === 3);
    check('pebbles refilled on floor change', world.player.pebbles >= 6);
    check('never caught during the test walk', !world.caught);
    check('never won early', !world.won);
    void EVENT_ALARM;
    void EVENT_CAUGHT;
    void EVENT_COIN;
    void EVENT_KEY;
    void EVENT_PEBBLE;
    void EVENT_UNLOCK;
    void EVENT_WIN;
    void createRandom;
  } catch (error) {
    failures.push(`threw: ${error && error.message ? error.message : String(error)}`);
  }
  renderer.draw(world, SCREEN_PLAY, readBest());
  document.title = failures.length === 0
    ? 'SELFTEST PASS'
    : `SELFTEST FAIL: ${failures.join('; ')}`;
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Stay out of the cones.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (won) {
      if (!best || best !== 'GHOST') {
        best = world.rank;
        saveBest(best);
      }
      audio.win();
      announce(`Escaped with rank ${world.rank}. Score ${world.score}.`);
    } else {
      audio.caught();
      announce(`Caught on ${['Floor 1', 'Floor 2', 'Floor 3'][world.floorIndex]}. Score ${world.score}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicked = input.takeClick();
    if ((actions & ACTION_CONFIRM || clicked) && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function handleEvents(events) {
    if (events & EVENT_ALARM) audio.alarm();
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_KEY) audio.treasure();
    if (events & EVENT_UNLOCK) audio.treasure();
    if (events & EVENT_PEBBLE) audio.pebble();
    if (events & EVENT_FLOOR) {
      audio.unlockDoor();
      world.nextFloor();
      announce(world.floorIndex === 1 ? 'Floor 2 — The Gallery.' : 'Floor 3 — The Vault.');
    }
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_CAUGHT) endGame(false);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.playerHidden = true;
      world.step(STEP, { x: 0, y: 0, posture: 'walk', throwAt: null, attract: true });
      return;
    }
    world.playerHidden = false;
    const move = input.direction();
    const events = world.step(STEP, {
      x: move.x,
      y: move.y,
      posture: input.posture(),
      throwAt: input.takeThrow(),
    });
    playGuardSteps();
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Quiet Vault. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

window.addEventListener('error', (event) => {
  document.title = `PAGE_ERROR: ${event.message}`;
});

if (selftest) runSelfTest();
else if (shot) runShot(shot);
else runGame();

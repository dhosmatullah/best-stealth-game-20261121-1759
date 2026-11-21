// Every tuning number and colour in one place. The playfield is a fixed
// 1280x704 logical area (40 by 22 tiles of 32 px); the renderer scales it to
// the window, so no rule below depends on the screen size.

export const TILE = 32;
export const COLS = 40;
export const ROWS = 22;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels per second for each of the thief's postures. */
export const PLAYER = {
  radius: 11,
  walkSpeed: 96,
  sneakSpeed: 56,
  runSpeed: 152,
  pebbles: 6,
  pebbleRefill: 2,
};

/** Pixels per second for a warden in each of its moods. */
export const GUARD = {
  radius: 13,
  patrolSpeed: 54,
  investigateSpeed: 78,
  chaseSpeed: 108,
  returnSpeed: 66,
  /** Tiles of sight when the thief is out in the open. */
  sightRange: 7.5,
  /** Half of the vision cone's opening angle, in radians. */
  halfAngle: 0.62,
  /** Seconds a warden keeps chasing after losing sight before it gives up. */
  loseSightSeconds: 2.5,
  /** Seconds a warden sniffs around the last place it saw the thief. */
  searchSeconds: 3.5,
};

/** How fast the detection meter fills (per second) and drains. */
export const DETECTION = {
  /** Base fill rate at point-blank range, in the open, walking. */
  base: 1.15,
  /** Multiplier while the thief stands in a lit pool. */
  lit: 1.7,
  /** Multiplier while the thief stands in plain shadow. */
  shadow: 0.8,
  /** Multiplier while the thief crouches inside a fern planter. */
  bush: 0.28,
  /** Multiplier while sneaking / running. */
  sneak: 0.55,
  run: 1.6,
  /** Drain per second once no warden can see the thief. */
  drain: 0.45,
};

/** Noise rings, in pixels: running feet and gravel underfoot carry sound. */
export const NOISE = {
  runRadius: 118,
  gravelRadius: 64,
  pebbleRadius: 150,
  stepInterval: 0.34,
};

export const SCORE = {
  coin: 100,
  sapphire: 500,
  floorBonus: 250,
  /** Time bonus points per second under the par time on a win. */
  timeBonusPerSecond: 2,
  parSeconds: 300,
};

/** Points of light the wardens carry; the palette is a night museum. */
export const PALETTE = {
  backdrop: '#0b0e16',
  floorA: '#232a3d',
  floorB: '#202636',
  floorLine: '#1a2030',
  litFloor: '#4a3d24',
  litGlow: '#e8b64c',
  gravel: '#3a3f52',
  gravelSpeck: '#565d78',
  bush: '#17351f',
  bushLeaf: '#2c6b3a',
  wall: '#12161f',
  wallTop: '#39415a',
  wallEdge: '#05070b',
  player: '#7fe3ff',
  playerSneak: '#4fa8c9',
  guard: '#ff5d5d',
  guardCalm: '#ffb347',
  coneCalm: 'rgba(255, 179, 71, 0.20)',
  coneSuspicious: 'rgba(255, 140, 40, 0.30)',
  coneChase: 'rgba(255, 60, 60, 0.38)',
  coin: '#f2c94c',
  key: '#ffd76a',
  sapphire: '#6fe3ff',
  exit: '#58e08a',
  stairs: '#c9a86a',
  pebble: '#c8ccd8',
  text: '#eef1f5',
  muted: '#9aa3b5',
  panel: 'rgba(10, 13, 22, 0.82)',
  alarm: '#ff4040',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best rank is kept between visits (this browser only). */
export const BEST_KEY = 'quiet-vault.best';

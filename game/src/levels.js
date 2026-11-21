// The three floors of the Harrowgate Museum, built by a small grid builder
// instead of hand-counted strings, so every wall lands exactly where it is
// meant to. Legend: '#' wall, '.' marble, ',' gravel (loud underfoot),
// '"' fern planter (hides the thief), 'L' lit pool (seen faster there),
// 'S' the thief's start, 'K' a vault key, 'C' a coin, '>' stairs down,
// 'V' the Moon Sapphire, 'E' the exit.
//
// Floor 1, The Lobby: steal the Brass Key and slip downstairs.
// Floor 2, The Gallery: the Silver Key, longer patrols, louder gravel runs.
// Floor 3, The Vault: the Moon Sapphire sits in the locked vault room; take
// it, then reach the exit before the wardens close the net.
import { COLS, ROWS } from './config.js';

function newGrid() {
  const grid = [];
  for (let y = 0; y < ROWS; y += 1) grid.push(new Array(COLS).fill('.'));
  for (let x = 0; x < COLS; x += 1) {
    grid[0][x] = '#';
    grid[ROWS - 1][x] = '#';
  }
  for (let y = 0; y < ROWS; y += 1) {
    grid[y][0] = '#';
    grid[y][COLS - 1] = '#';
  }
  return grid;
}

function hwall(grid, x0, x1, y) {
  for (let x = x0; x <= x1; x += 1) grid[y][x] = '#';
}

function vwall(grid, x, y0, y1) {
  for (let y = y0; y <= y1; y += 1) grid[y][x] = '#';
}

function patch(grid, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) grid[y][x] = ch;
  }
}

function set(grid, x, y, ch) {
  grid[y][x] = ch;
}

/** A 5x5 hollow display case with a one-tile door on the named side. */
function displayCase(grid, x, y, doorSide) {
  hwall(grid, x, x + 4, y);
  hwall(grid, x, x + 4, y + 4);
  vwall(grid, x, y + 1, y + 3);
  vwall(grid, x + 4, y + 1, y + 3);
  const cx = x + 2;
  const cy = y + 2;
  if (doorSide === 'north') grid[y][cx] = '.';
  else if (doorSide === 'south') grid[y + 4][cx] = '.';
  else if (doorSide === 'west') grid[cy][x] = '.';
  else grid[cy][x + 4] = '.';
}

/** A 4x5 hollow side room with a one-tile door on the named side. */
function sideRoom(grid, x, y, doorSide) {
  hwall(grid, x, x + 3, y);
  hwall(grid, x, x + 3, y + 4);
  vwall(grid, x, y + 1, y + 3);
  vwall(grid, x + 3, y + 1, y + 3);
  if (doorSide === 'north') grid[y][x + 1] = '.';
  else if (doorSide === 'south') grid[y + 4][x + 1] = '.';
  else if (doorSide === 'west') grid[y + 2][x] = '.';
  else grid[y + 2][x + 3] = '.';
}

function freeze(grid) {
  return grid.map((row) => row.join(''));
}

function lobby() {
  const g = newGrid();
  // The hall's spine wall, with gaps to slip through at rows 5, 11 and 19.
  vwall(g, 20, 1, 4);
  vwall(g, 20, 6, 10);
  vwall(g, 20, 12, 18);
  set(g, 20, 20, '#');
  displayCase(g, 5, 6, 'east');
  displayCase(g, 25, 6, 'west');
  sideRoom(g, 12, 12, 'east');
  sideRoom(g, 26, 15, 'west');
  // Fern planters to crouch behind.
  patch(g, 3, 3, 4, 4, '"');
  patch(g, 26, 3, 27, 4, '"');
  patch(g, 3, 17, 4, 18, '"');
  patch(g, 34, 12, 35, 13, '"');
  // Gravel strips the wardens love to patrol across.
  patch(g, 7, 1, 8, 2, ',');
  patch(g, 5, 14, 6, 15, ',');
  patch(g, 30, 19, 33, 20, ',');
  // Lit pools under the hanging lamps.
  set(g, 15, 1, 'L');
  set(g, 15, 2, 'L');
  set(g, 10, 4, 'L');
  set(g, 24, 12, 'L');
  set(g, 8, 18, 'L');
  set(g, 2, 1, 'S');
  set(g, 27, 7, 'K');
  set(g, 7, 8, 'C');
  set(g, 36, 4, 'C');
  set(g, 33, 13, 'C');
  set(g, 8, 20, 'C');
  set(g, 24, 19, 'C');
  set(g, 33, 20, '>');
  return freeze(g);
}

function gallery() {
  const g = newGrid();
  // Two spine walls and a cross wall, leaving patrol corridors between them.
  vwall(g, 13, 1, 8);
  vwall(g, 13, 10, 17);
  vwall(g, 27, 4, 12);
  vwall(g, 27, 14, 20);
  hwall(g, 14, 26, 8);
  displayCase(g, 5, 3, 'south');
  displayCase(g, 30, 3, 'south');
  displayCase(g, 16, 12, 'north');
  sideRoom(g, 33, 15, 'west');
  patch(g, 3, 10, 4, 11, '"');
  patch(g, 22, 2, 23, 3, '"');
  patch(g, 35, 10, 36, 11, '"');
  patch(g, 8, 18, 9, 19, '"');
  // A long gravel run down the middle corridor.
  patch(g, 19, 2, 20, 6, ',');
  patch(g, 19, 15, 20, 19, ',');
  patch(g, 32, 1, 33, 2, ',');
  set(g, 6, 1, 'L');
  set(g, 17, 5, 'L');
  set(g, 24, 10, 'L');
  set(g, 10, 13, 'L');
  set(g, 30, 19, 'L');
  set(g, 2, 1, 'S');
  set(g, 34, 17, 'K');
  set(g, 7, 5, 'C');
  set(g, 32, 5, 'C');
  set(g, 18, 10, 'C');
  set(g, 24, 16, 'C');
  set(g, 10, 19, 'C');
  set(g, 37, 13, 'C');
  set(g, 2, 20, '>');
  return freeze(g);
}

function vault() {
  const g = newGrid();
  // The vault room, top right, entered through one door at (29, 4).
  hwall(g, 29, 38, 7);
  vwall(g, 29, 1, 3);
  vwall(g, 29, 5, 7);
  // A long display wall down the middle of the hall.
  vwall(g, 18, 9, 13);
  vwall(g, 18, 15, 19);
  hwall(g, 10, 17, 12);
  displayCase(g, 4, 4, 'east');
  displayCase(g, 22, 3, 'west');
  sideRoom(g, 30, 12, 'north');
  patch(g, 3, 10, 4, 11, '"');
  patch(g, 12, 17, 13, 18, '"');
  patch(g, 24, 17, 25, 18, '"');
  patch(g, 34, 10, 35, 11, '"');
  patch(g, 6, 14, 9, 15, ',');
  patch(g, 20, 5, 21, 8, ',');
  patch(g, 31, 18, 34, 19, ',');
  set(g, 8, 2, 'L');
  set(g, 15, 6, 'L');
  set(g, 26, 9, 'L');
  set(g, 33, 4, 'L');
  set(g, 12, 20, 'L');
  set(g, 2, 1, 'S');
  set(g, 36, 3, 'V');
  set(g, 6, 6, 'C');
  set(g, 24, 5, 'C');
  set(g, 14, 14, 'C');
  set(g, 32, 14, 'C');
  set(g, 20, 20, 'C');
  set(g, 2, 20, 'E');
  return freeze(g);
}

export const LEVELS = [
  {
    name: 'Floor 1 — The Lobby',
    sub: 'Steal the Brass Key, then slip down the stairs.',
    map: lobby(),
    patrols: [
      [[5, 2], [16, 2], [16, 18], [5, 18]],
      [[24, 3], [35, 3], [35, 17], [24, 17]],
    ],
  },
  {
    name: 'Floor 2 — The Gallery',
    sub: 'Three wardens now. The Silver Key waits in the east room.',
    map: gallery(),
    patrols: [
      [[4, 5], [11, 5], [11, 16], [4, 16]],
      [[16, 3], [24, 3], [24, 18], [16, 18]],
      [[31, 9], [37, 9], [37, 18], [31, 18]],
    ],
  },
  {
    name: 'Floor 3 — The Vault',
    sub: 'The Moon Sapphire is in the vault. Take it, then run for the exit.',
    map: vault(),
    patrols: [
      [[4, 10], [20, 4], [20, 17], [4, 17]],
      [[24, 10], [24, 19], [36, 19], [36, 10]],
      [[10, 10], [16, 10], [16, 19], [10, 19]],
    ],
  },
];

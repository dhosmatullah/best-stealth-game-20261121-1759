// The screenshot scenes behind ?shot=cover|shadow|alarm|vault. Each one sets
// the real world to a staged moment — the thief mid-sneak, a warden's cone
// sweeping past a fern, a chase in full alarm, the vault itself — then plays
// it forward a few seconds with scripted movement, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { STEP, TILE } from './config.js';
import { tileCentre } from './vision.js';
import { SCREEN_PLAY } from './render.js';

/** Put the thief on a tile and face it toward the wardens. */
function placePlayer(world, tx, ty, angle) {
  const centre = tileCentre(tx, ty);
  world.player.x = centre.x;
  world.player.y = centre.y;
  world.player.angle = angle;
  world.player.posture = 'sneak';
}

/** Put a warden on a tile, facing `angle`, in patrol with a fresh meter. */
function placeGuard(world, index, tx, ty, angle) {
  const guard = world.guards[index];
  if (!guard) return;
  const centre = tileCentre(tx, ty);
  guard.x = centre.x;
  guard.y = centre.y;
  guard.angle = angle;
  guard.alert = 0;
  guard.state = 'patrol';
  guard.waypointIndex = (index + 1) % guard.waypoints.length;
}

function runSteps(world, seconds, move) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, move || { x: 0, y: 0, posture: 'sneak', throwAt: null });
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any other name is the cover.
 */
export function stageShot(name, world) {
  if (name === 'shadow') {
    world.loadFloor(0, false);
    // Crouched in the fern planter at (3, 3) while a warden sweeps past.
    // The meter is set high and the scene runs only briefly, so the HUD
    // still shows the half-full bar: seen, but hidden well enough to fade.
    placePlayer(world, 3, 3, 0);
    placeGuard(world, 0, 8, 3, Math.PI);
    placeGuard(world, 1, 24, 6, -Math.PI / 2);
    world.guards[0].alert = 0.62;
    runSteps(world, 0.5, { x: 0, y: 0, posture: 'sneak', throwAt: null });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'alarm') {
    world.loadFloor(1, false);
    // Caught mid-gallery: the thief runs, a warden closes in behind.
    placePlayer(world, 18, 10, 0);
    world.player.posture = 'run';
    const guard = world.guards[1];
    const centre = tileCentre(14, 10);
    guard.x = centre.x;
    guard.y = centre.y;
    guard.angle = 0;
    guard.alert = 1;
    guard.state = 'chase';
    guard.lastSeen = { x: world.player.x, y: world.player.y };
    placeGuard(world, 0, 6, 5, Math.PI / 2);
    placeGuard(world, 2, 32, 8, Math.PI);
    runSteps(world, 0.9, { x: 1, y: 0, posture: 'run', throwAt: null });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'vault') {
    world.loadFloor(2, false);
    // One step from the Moon Sapphire, a warden patrolling the vault door.
    // The thief holds still: drifting toward the gem would pick it up and
    // the shot would lose the very thing it is meant to show.
    world.keyTaken = true;
    placePlayer(world, 34, 3, 0);
    placeGuard(world, 0, 8, 4, 0);
    placeGuard(world, 1, 30, 9, -Math.PI / 2);
    placeGuard(world, 2, 12, 14, Math.PI / 2);
    runSteps(world, 1.6, { x: 0, y: 0, posture: 'sneak', throwAt: null });
    return { screen: SCREEN_PLAY };
  }
  // Cover: the lobby at its best — thief mid-hall with a cone sweeping
  // toward them, the Brass Key glinting in its case, coins on the marble.
  world.loadFloor(0, false);
  placePlayer(world, 10, 5, 0);
  placeGuard(world, 0, 12, 2, Math.PI / 2);
  placeGuard(world, 1, 28, 5, -Math.PI / 2);
  runSteps(world, 1.5, { x: 0.3, y: 0, posture: 'sneak', throwAt: null });
  return { screen: SCREEN_PLAY };
}

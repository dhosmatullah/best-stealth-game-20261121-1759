// The painter: marble floors and lamplight, fern planters and gravel, the
// wardens' cones sweeping the hall, and the HUD that tells the thief how
// close it is to being seen. Everything is drawn from the world, so a
// screenshot is always a real frame of the game.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, GUARD, PLAYER, PALETTE, FONT } from './config.js';
import { raycast } from './vision.js';
import { STATE_CHASE, STATE_INVESTIGATE, STATE_SEARCH } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const CONE_RAYS = 18;

function coneColour(guard) {
  if (guard.state === STATE_CHASE) return PALETTE.coneChase;
  if (guard.alert > 0.45 || guard.state === STATE_INVESTIGATE || guard.state === STATE_SEARCH) return PALETTE.coneSuspicious;
  return PALETTE.coneCalm;
}

function guardColour(guard) {
  if (guard.state === STATE_CHASE) return PALETTE.guard;
  if (guard.alert > 0.45) return PALETTE.guardCalm;
  return '#e8a34c';
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');

  function drawFloor(world) {
    const { grid } = world;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const ch = grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (ch === '#') {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(px, py, TILE, 4);
          ctx.fillStyle = PALETTE.wallEdge;
          ctx.fillRect(px, py + TILE - 2, TILE, 2);
          continue;
        }
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = PALETTE.floorLine;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (ch === 'L') {
          ctx.fillStyle = PALETTE.litFloor;
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          const glow = ctx.createRadialGradient(px + 16, py + 16, 2, px + 16, py + 16, 26);
          glow.addColorStop(0, 'rgba(232, 182, 76, 0.28)');
          glow.addColorStop(1, 'rgba(232, 182, 76, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(px - 10, py - 10, TILE + 20, TILE + 20);
          ctx.fillStyle = PALETTE.litGlow;
          ctx.beginPath();
          ctx.arc(px + 16, py + 16, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === ',') {
          ctx.fillStyle = PALETTE.gravel;
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = PALETTE.gravelSpeck;
          ctx.fillRect(px + 7, py + 9, 3, 3);
          ctx.fillRect(px + 19, py + 20, 3, 3);
          ctx.fillRect(px + 22, py + 7, 2, 2);
        } else if (ch === '"') {
          ctx.fillStyle = PALETTE.bush;
          ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = PALETTE.bushLeaf;
          ctx.beginPath();
          ctx.arc(px + 10, py + 12, 6, 0, Math.PI * 2);
          ctx.arc(px + 22, py + 20, 7, 0, Math.PI * 2);
          ctx.arc(px + 22, py + 9, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawObjectives(world) {
    for (let i = 0; i < world.coins.length; i += 1) {
      const coin = world.coins[i];
      if (coin.taken) continue;
      const cx = coin.x * TILE + 16;
      const cy = coin.y * TILE + 16;
      ctx.fillStyle = PALETTE.coin;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6d1f';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.key && !world.keyTaken) {
      const cx = world.key.x * TILE + 16;
      const cy = world.key.y * TILE + 16;
      ctx.strokeStyle = PALETTE.key;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 3, cy, 6, 0, Math.PI * 2);
      ctx.moveTo(cx + 3, cy);
      ctx.lineTo(cx + 11, cy);
      ctx.moveTo(cx + 8, cy);
      ctx.lineTo(cx + 8, cy + 5);
      ctx.moveTo(cx + 11, cy);
      ctx.lineTo(cx + 11, cy + 5);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (world.sapphire && !world.sapphireTaken) {
      const cx = world.sapphire.x * TILE + 16;
      const cy = world.sapphire.y * TILE + 16;
      ctx.fillStyle = PALETTE.sapphire;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 11);
      ctx.lineTo(cx + 9, cy - 1);
      ctx.lineTo(cx, cy + 11);
      ctx.lineTo(cx - 9, cy - 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 11);
      ctx.lineTo(cx + 4, cy - 1);
      ctx.lineTo(cx, cy + 2);
      ctx.lineTo(cx - 4, cy - 1);
      ctx.closePath();
      ctx.fill();
    }
    if (world.stairs) {
      const cx = world.stairs.x * TILE + 16;
      const cy = world.stairs.y * TILE + 16;
      ctx.fillStyle = world.keyTaken ? PALETTE.exit : PALETTE.stairs;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▼', cx, cy);
      ctx.font = `9px ${FONT}`;
      ctx.fillText(world.keyTaken ? 'OPEN' : 'LOCKED', cx, cy + 13);
    }
    if (world.exit) {
      const cx = world.exit.x * TILE + 16;
      const cy = world.exit.y * TILE + 16;
      ctx.fillStyle = world.sapphireTaken ? PALETTE.exit : '#5a6b52';
      ctx.fillRect(cx - 13, cy - 13, 26, 26);
      ctx.fillStyle = '#0b0e16';
      ctx.font = `bold 9px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', cx, cy);
    }
  }

  function drawCone(guard, world) {
    const range = GUARD.sightRange * TILE;
    ctx.fillStyle = coneColour(guard);
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    for (let i = 0; i <= CONE_RAYS; i += 1) {
      const angle = guard.angle - GUARD.halfAngle + (2 * GUARD.halfAngle * i) / CONE_RAYS;
      const distance = raycast(world.grid, guard.x, guard.y, angle, range);
      ctx.lineTo(guard.x + Math.cos(angle) * distance, guard.y + Math.sin(angle) * distance);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawGuard(guard) {
    ctx.fillStyle = guardColour(guard);
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // The direction the warden faces: a short nose and two eyes.
    ctx.fillStyle = '#1a1208';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    if (guard.state === STATE_CHASE) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', guard.x, guard.y - 26);
    } else if (guard.state === STATE_INVESTIGATE || guard.state === STATE_SEARCH) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', guard.x, guard.y - 26);
    }
    if (guard.alert > 0.05 && guard.state !== STATE_CHASE) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.alert);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  function drawPlayer(world) {
    const player = world.player;
    if (world.playerHidden) return;
    const radius = player.posture === 'sneak' ? 9 : PLAYER.radius;
    ctx.fillStyle = player.posture === 'sneak' ? PALETTE.playerSneak : PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b0e16';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0b0e16';
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.angle) * 6, player.y + Math.sin(player.angle) * 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    if (player.posture === 'run') {
      ctx.strokeStyle = 'rgba(127, 227, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawNoise(world) {
    for (let i = 0; i < world.noiseRings.length; i += 1) {
      const ring = world.noiseRings[i];
      const progress = 1 - ring.ttl / ring.maxTtl;
      ctx.strokeStyle = `rgba(255, 220, 120, ${0.7 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius * progress + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (world.pebble) {
      const p = world.pebble;
      const x = p.fromX + (p.toX - p.fromX) * p.t;
      const y = p.fromY + (p.toY - p.fromY) * p.t - Math.sin(p.t * Math.PI) * 26;
      ctx.fillStyle = PALETTE.pebble;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(world) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`QUIET VAULT — ${LEVELS_NAME(world)}`, 12, 17);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(world.objective(), 300, 17);
    const alert = world.maxAlert();
    if (alert > 0.05) {
      const barX = 640;
      const barW = 200;
      ctx.fillStyle = '#333a4d';
      ctx.fillRect(barX, 11, barW, 12);
      ctx.fillStyle = alert > 0.66 ? PALETTE.alarm : alert > 0.33 ? '#ff9a3d' : '#e8c34c';
      ctx.fillRect(barX, 11, barW * alert, 12);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(world.alarmActive() ? 'SPOTTED!' : 'SEEN', barX + barW + 8, 17);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `12px ${FONT}`;
    const right = `◉ ${world.coinsCollected}   ◆ ${world.player.pebbles}   ⏱ ${formatTime(world.time)}   ★ ${world.score}`;
    ctx.fillText(right, VIEW_W - 12, 17);
    ctx.textAlign = 'left';
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent || PALETTE.text;
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 110);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT}`;
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], VIEW_W / 2, VIEW_H / 2 - 46 + i * 26);
    }
  }

  function draw(world, screen, best) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawFloor(world);
    drawObjectives(world);
    for (let i = 0; i < world.guards.length; i += 1) drawCone(world.guards[i], world);
    for (let i = 0; i < world.guards.length; i += 1) drawGuard(world.guards[i]);
    drawPlayer(world);
    drawNoise(world);
    drawHud(world);
    if (screen === SCREEN_TITLE) {
      drawOverlay('QUIET VAULT', [
        'A stealth heist in three floors of the Harrowgate Museum.',
        'WASD / arrows to move · C to sneak · Shift to run · Click to throw a pebble',
        'Stay out of the cones. Ferns hide you, gravel betrays you, lamplight exposes you.',
        'Steal the key, take the Moon Sapphire, reach the EXIT unseen.',
        'Press Enter or click to begin.',
        best ? `Best rank so far: ${best}` : '',
      ]);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['Press P or Enter to keep sneaking.']);
    } else if (screen === SCREEN_OVER) {
      drawOverlay('CAUGHT!', [
        `The wardens closed the net on ${LEVELS_NAME(world)}.`,
        `Score ${world.score} · Coins ${world.coinsCollected} · Time ${formatTime(world.time)}`,
        'Press Enter to try the heist again.',
      ], PALETTE.alarm);
    } else if (screen === SCREEN_WIN) {
      drawOverlay(`RANK: ${world.rank}`, [
        'The Moon Sapphire is yours, and no warden saw you leave.',
        `Score ${world.score} · Coins ${world.coinsCollected} · Alarms raised ${world.alarms} · Time ${formatTime(world.time)}`,
        world.rank === 'GHOST' ? 'Not a single warden ever knew you were there.' : world.rank === 'SHADOW' ? 'Seen, but never caught. A clean shadow.' : 'Loud, but the sapphire still left the building.',
        'Press Enter to run the heist again.',
      ], PALETTE.sapphire);
    }
  }

  return { draw };
}

function LEVELS_NAME(world) {
  return ['Floor 1 — The Lobby', 'Floor 2 — The Gallery', 'Floor 3 — The Vault'][world.floorIndex] || '';
}

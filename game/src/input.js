// Keyboard and mouse: WASD or arrows to move, C toggles the sneak, Shift
// held is a run, a click throws a pebble at that spot, Space or Enter
// confirms, P pauses. The canvas reports clicks in logical game pixels,
// whatever size the window stretched it to.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let sneak = false;
  let throwAt = null;

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyC') {
      sneak = !sneak;
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  canvas.addEventListener('pointerdown', (event) => {
    throwAt = canvasPoint(event.clientX, event.clientY);
  });

  return {
    /** The held movement direction, normalised, or (0, 0). */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      const length = Math.hypot(x, y);
      if (length === 0) return { x: 0, y: 0 };
      return { x: x / length, y: y / length };
    },
    /** 'sneak' while toggled, 'run' while Shift is held, else 'walk'. */
    posture() {
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) return 'run';
      return sneak ? 'sneak' : 'walk';
    },
    /** One-shot actions since the last call (confirm, pause). */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click's game position, once, or null. */
    takeThrow() {
      const taken = throwAt;
      throwAt = null;
      return taken;
    },
    /** A click anywhere (used to start from the title screen). */
    takeClick() {
      return this.takeThrow() !== null;
    },
  };
}

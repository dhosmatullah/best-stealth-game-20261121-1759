// Synthesised sound, no audio files: footsteps that place a warden by ear,
// a sting when the alarm rises, a chime for loot, a chord for an unlocked
// door. Everything is built from oscillators and filtered noise at run time,
// and nothing plays until the player has pressed a key or clicked.
export function createAudio() {
  let ctx = null;
  let master = null;
  let ambient = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, duration, type, gainValue, slideTo) {
    if (!ensure()) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      // Sound is garnish: a failure here must never stop the game.
    }
  }

  function noiseBurst(duration, gainValue, filterFreq) {
    if (!ensure()) return;
    try {
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = ctx.createGain();
      gain.gain.value = gainValue;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // See tone(): sound never stops the game.
    }
  }

  return {
    /** Call from any user gesture so the browser lets sound start. */
    unlock() {
      ensure();
      if (!ctx || ambient) return;
      try {
        // A low, barely-there hum for the museum at night.
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 55;
        const gain = ctx.createGain();
        gain.gain.value = 0.035;
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        ambient = osc;
      } catch {
        // See tone().
      }
    },
    /** A soft shoe on marble; `distance` in pixels fades it with range. */
    footstep(distance) {
      const gain = Math.max(0, 0.16 * (1 - distance / 560));
      if (gain <= 0.01) return;
      noiseBurst(0.07, gain, 900);
    },
    /** A warden's heavier boot, placed by ear the same way. */
    guardStep(distance) {
      const gain = Math.max(0, 0.22 * (1 - distance / 620));
      if (gain <= 0.01) return;
      noiseBurst(0.09, gain, 420);
    },
    /** The alarm sting: two notes a semitone apart, falling. */
    alarm() {
      tone(620, 0.22, 'sawtooth', 0.16, 590);
      setTimeout(() => tone(587, 0.3, 'sawtooth', 0.16, 440), 180);
    },
    /** A coin's bright two-note chime. */
    coin() {
      tone(880, 0.09, 'sine', 0.18);
      setTimeout(() => tone(1318, 0.16, 'sine', 0.16), 80);
    },
    /** The key and the sapphire: a rising three-note arpeggio. */
    treasure() {
      tone(523, 0.12, 'triangle', 0.2);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.2), 110);
      setTimeout(() => tone(784, 0.26, 'triangle', 0.2), 220);
    },
    /** A pebble ticking across marble. */
    pebble() {
      noiseBurst(0.05, 0.2, 2400);
    },
    /** The stairs unlocking: a low, settled chord. */
    unlockDoor() {
      tone(220, 0.4, 'triangle', 0.18);
      setTimeout(() => tone(277, 0.4, 'triangle', 0.16), 90);
      setTimeout(() => tone(330, 0.5, 'triangle', 0.16), 180);
    },
    /** The vault opening and the win: a slow major lift. */
    win() {
      [523, 659, 784, 1046].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.5, 'triangle', 0.18), i * 130);
      });
    },
    /** Caught: a short, low thud. */
    caught() {
      tone(160, 0.35, 'sawtooth', 0.2, 70);
    },
  };
}

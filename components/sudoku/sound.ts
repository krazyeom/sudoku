// Web Audio API Synthesizer with Persistent Shared AudioContext & Master Gain Node
// Solves browser autoplay policy & rapid context recreation limitations

class SoundEffects {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isUnlocked: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;

      try {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Unlocks the persistent AudioContext on user interaction.
   * Calling this guarantees browser autoplay restrictions are lifted.
   */
  unlockAudio(): void {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    this.isUnlocked = true;
  }

  private getDestination(ctx: AudioContext): AudioNode {
    return this.masterGain ?? ctx.destination;
  }

  /**
   * Sound toggle confirmation beep.
   * Plays a cheerful confirmation sound so user immediately hears that sound is active.
   */
  async playToggle(enabled: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (enabled) {
        // High cheerful two-tone chime (G5 -> C6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.setValueAtTime(1046.5, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        // Gentle descending click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(392.0, now + 0.06);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now);
        osc.stop(now + 0.16);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Played on match victory or solo puzzle complete.
   * Glorious multi-voice celebratory fanfare.
   */
  async playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime + 0.02;

      // Brass-like fanfare: C5, E5, G5, High C6, E6
      const fanfareMelody = [
        { freq: 523.25, time: 0, dur: 0.15 },
        { freq: 659.25, time: 0.14, dur: 0.15 },
        { freq: 783.99, time: 0.28, dur: 0.18 },
        { freq: 1046.5, time: 0.44, dur: 0.45 },
        { freq: 1318.5, time: 0.65, dur: 0.6 },
      ];

      fanfareMelody.forEach(({ freq, time, dur }, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index >= 3 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.25, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });

      // Warm bass support (C3 -> G3 -> C4)
      const bassTones = [
        { freq: 130.81, time: 0, dur: 0.35 },
        { freq: 196.0, time: 0.35, dur: 0.35 },
        { freq: 261.63, time: 0.65, dur: 0.7 },
      ];

      bassTones.forEach(({ freq, time, dur }) => {
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(freq, now + time);

        bassGain.gain.setValueAtTime(0.0001, now + time);
        bassGain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.03);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        bass.connect(bassGain);
        bassGain.connect(this.getDestination(ctx));
        bass.start(now + time);
        bass.stop(now + time + dur + 0.05);
      });
    } catch {
      // ignore
    }
  }

  // Alias for backward compatibility
  async playCompletion() {
    return this.playVictory();
  }

  /**
   * Played on single cell correct entry.
   * Clear sparkling chime.
   */
  async playCorrect() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      // Two rapid harmonic bells (E6 -> A6)
      [
        { freq: 1318.51, delay: 0 },
        { freq: 1760.0, delay: 0.05 },
      ].forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + delay);
        osc.stop(now + delay + 0.22);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Tactile click when tapping any cell on the board.
   */
  async playCellSelect() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.035);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // ignore
    }
  }

  /**
   * Played on neutral keypad input / selection.
   */
  async playInput(number: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420 + number * 35, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  /**
   * Played when clearing a cell.
   */
  async playErase() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  /**
   * Played on note toggle or candidate entry.
   */
  async playNote() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // ignore
    }
  }

  /**
   * Sound for Hint and AutoFill features.
   */
  async playAction(type: 'hint' | 'autofill' | 'undo' = 'hint') {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'hint') {
        // Magical twinkle (D6 -> A6)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1174.66, now);
        osc.frequency.exponentialRampToValueAtTime(1760.0, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      } else if (type === 'autofill') {
        // Power pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(1046.5, now + 0.07);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } else {
        // Undo whoosh down
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      }

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // ignore
    }
  }

  /**
   * Played when a full row or column is completed.
   * Shimmering harmonic line chime.
   */
  async playLineClear(type: 'row' | 'col' = 'row') {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      const baseFreqs = type === 'row' ? [698.46, 880.0, 1046.5] : [783.99, 987.77, 1174.66];

      baseFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.3);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Played when a 3x3 9-cell square is completed.
   * Deep, punchy resonant power chord.
   */
  async playBoxClear() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      const chord = [261.63, 392.0, 523.25, 659.25];

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now);
        osc.stop(now + 0.5);
      });

      // Accent bell
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'triangle';
      bell.frequency.setValueAtTime(1046.5, now + 0.08);
      bellGain.gain.setValueAtTime(0.0001, now + 0.08);
      bellGain.gain.exponentialRampToValueAtTime(0.14, now + 0.09);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      bell.connect(bellGain);
      bellGain.connect(this.getDestination(ctx));
      bell.start(now + 0.08);
      bell.stop(now + 0.38);
    } catch {
      // ignore
    }
  }

  // Alias
  async playUnitComplete() {
    return this.playLineClear();
  }

  /**
   * Played when firing an attack / penalty to your opponent.
   */
  async playAttackLaunch() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // ignore
    }
  }

  /**
   * Played when opponent debuffs you.
   */
  async playAttacked() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      [0, 0.12].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now + offset);
        osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.1);

        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });

      const rumble = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      rumble.type = 'sine';
      rumble.frequency.setValueAtTime(110, now);
      rumble.frequency.exponentialRampToValueAtTime(45, now + 0.35);
      rumbleGain.gain.setValueAtTime(0.22, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      rumble.connect(rumbleGain);
      rumbleGain.connect(this.getDestination(ctx));
      rumble.start(now);
      rumble.stop(now + 0.4);
    } catch {
      // ignore
    }
  }

  /**
   * Played when board gets frozen.
   */
  async playFreeze() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const tones = [1400, 1850, 2400];

      tones.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.0001, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.14);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Dynamic Speed Combo chime.
   */
  async playCombo(combo: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      const scales = [
        [523.25, 659.25],
        [587.33, 783.99],
        [659.25, 880.0, 1046.5],
        [783.99, 1046.5, 1318.51],
        [880.0, 1174.66, 1396.91, 1760.0],
      ];
      const noteArray = scales[Math.min(scales.length - 1, Math.max(0, combo - 2))];

      noteArray.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.06 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Played when an active combo is broken by an incorrect move.
   */
  async playComboBreak() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.22);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.27);
    } catch {
      // ignore
    }
  }

  /**
   * Played on incorrect number placement.
   */
  async playMistake(level: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = level > 1 ? 164.81 : 220.0;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + 0.14);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  /**
   * Consecutive mistake penalty buzzer.
   */
  async playConsecutiveMistake(count: number = 2) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const pulses = Math.min(3, count);

      for (let i = 0; i < pulses; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(146.83, now + i * 0.11);

        gain.gain.setValueAtTime(0.16, now + i * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.08);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.09);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Match defeat sound.
   */
  async playDefeat() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const notes = [392.0, 349.23, 311.13, 293.66, 261.63];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.32);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.35);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Retro 8-bit Konami cheat code fanfare
   */
  async playKonami() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.05 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.08);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.1);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Casino 777 Jackpot coin sound
   */
  async playJackpot() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const coinTones = [987.77, 1318.51, 1567.98, 1760.0, 2093.0, 2637.02];
      for (let rep = 0; rep < 3; rep++) {
        const offset = rep * 0.18;
        coinTones.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + offset + idx * 0.025);

          gain.gain.setValueAtTime(0.001, now + offset + idx * 0.025);
          gain.gain.exponentialRampToValueAtTime(0.2, now + offset + idx * 0.025 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + idx * 0.025 + 0.09);

          osc.connect(gain);
          gain.connect(this.getDestination(ctx));
          osc.start(now + offset + idx * 0.025);
          osc.stop(now + offset + idx * 0.025 + 0.11);
        });
      }
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEffects();

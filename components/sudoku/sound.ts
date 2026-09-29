// Web Audio API Synthesizer for tactile feedback & fanfare

class SoundEffects {
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
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
        gain.gain.exponentialRampToValueAtTime(0.18, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
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
        bassGain.gain.exponentialRampToValueAtTime(0.12, now + time + 0.03);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        bass.connect(bassGain);
        bassGain.connect(ctx.destination);
        bass.start(now + time);
        bass.stop(now + time + dur + 0.05);
      });

      window.setTimeout(() => void ctx.close(), 1600);
    } catch {
      try {
        await ctx.close();
      } catch {
        // ignore
      }
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
        gain.gain.exponentialRampToValueAtTime(0.08, now + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });

      window.setTimeout(() => void ctx.close(), 300);
    } catch {
      // ignore
    }
  }

  /**
   * Played on neutral keypad input / selection.
   */
  async playInput(number: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + number * 25, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      window.setTimeout(() => void ctx.close(), 200);
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
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      window.setTimeout(() => void ctx.close(), 200);
    } catch {
      // ignore
    }
  }

  /**
   * Played on note toggle.
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
      osc.frequency.setValueAtTime(750, now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);

      window.setTimeout(() => void ctx.close(), 150);
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

      // Row: F5 -> A5 -> C6; Col: G5 -> B5 -> D6
      const baseFreqs = type === 'row' ? [698.46, 880.0, 1046.5] : [783.99, 987.77, 1174.66];

      baseFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });

      window.setTimeout(() => void ctx.close(), 600);
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

      // 4-note resonant major chord: C4, G4, C5, E5
      const chord = [261.63, 392.0, 523.25, 659.25];

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      });

      // Accent bell
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'triangle';
      bell.frequency.setValueAtTime(1046.5, now + 0.08); // C6
      bellGain.gain.setValueAtTime(0.0001, now + 0.08);
      bellGain.gain.exponentialRampToValueAtTime(0.09, now + 0.09);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(now + 0.08);
      bell.stop(now + 0.38);

      window.setTimeout(() => void ctx.close(), 700);
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

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);

      window.setTimeout(() => void ctx.close(), 300);
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

        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });

      const rumble = ctx.createOscillator();
      const rumbleGain = ctx.createGain();
      rumble.type = 'sine';
      rumble.frequency.setValueAtTime(110, now);
      rumble.frequency.exponentialRampToValueAtTime(45, now + 0.35);
      rumbleGain.gain.setValueAtTime(0.18, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      rumble.connect(rumbleGain);
      rumbleGain.connect(ctx.destination);
      rumble.start(now);
      rumble.stop(now + 0.4);

      window.setTimeout(() => void ctx.close(), 600);
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
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.07, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.18);
      });

      window.setTimeout(() => void ctx.close(), 400);
    } catch {
      // ignore
    }
  }

  /**
   * Played on consecutive correct answers in quick succession (Speed Combo).
   * Progressively escalating arpeggio matching combo scale.
   */
  async playCombo(combo: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      // High-energy pitch tier based on combo count
      const baseFreq = combo <= 2 ? 587.33 : combo === 3 ? 659.25 : 783.99;
      const noteCount = Math.min(combo + 1, 5);

      for (let i = 0; i < noteCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = combo >= 4 ? 'sawtooth' : 'triangle';
        const freq = baseFreq * Math.pow(1.18, i);
        osc.frequency.setValueAtTime(freq, now + i * 0.045);

        gain.gain.setValueAtTime(0.001, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.045 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.045 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.18);
      }

      window.setTimeout(() => void ctx.close(), 500);
    } catch {
      // ignore
    }
  }

  /**
   * Played when an active combo streak is broken by an error.
   * Downward sad pitch slide.
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
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      window.setTimeout(() => void ctx.close(), 500);
    } catch {
      // ignore
    }
  }

  /**
   * Played on incorrect answer / mistake.
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
      const baseFreq = level > 1 ? 120 : 160;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.7, now + 0.14);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);

      window.setTimeout(() => void ctx.close(), 300);
    } catch {
      // ignore
    }
  }

  /**
   * Played on repeated consecutive mistakes (2nd or 3rd error).
   * Level 2: Heavy double hit
   * Level 3+: Lockdown siren pulses
   */
  async playConsecutiveMistake(count: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      if (count === 2) {
        // Double heavy strike
        [0, 0.12].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, now + offset);
          osc.frequency.exponentialRampToValueAtTime(65, now + offset + 0.1);

          gain.gain.setValueAtTime(0.18, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.13);
        });
      } else {
        // Lockdown emergency siren pulses (Count 3+)
        [0, 0.14, 0.28].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(380, now + offset);
          osc.frequency.linearRampToValueAtTime(520, now + offset + 0.06);
          osc.frequency.linearRampToValueAtTime(320, now + offset + 0.12);

          gain.gain.setValueAtTime(0.16, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.13);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.14);
        });
      }

      window.setTimeout(() => void ctx.close(), 600);
    } catch {
      // ignore
    }
  }

  /**
   * Played on duel defeat.
   * Melancholic minor descending cadence.
   */
  async playDefeat() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      // Minor mournful cadence: G4 -> F4 -> Eb4 -> D4 -> C4
      const notes = [392.0, 349.23, 311.13, 293.66, 261.63];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.35);
      });

      window.setTimeout(() => void ctx.close(), 1400);
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEffects();

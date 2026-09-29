// Web Audio API Synthesizer for tactile feedback & fanfare

class SoundEffects {
  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  }

  async playCompletion() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime + 0.02;
      const melody = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      melody.forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + index * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.11 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.11);
        osc.stop(now + index * 0.11 + 0.32);
      });

      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = 196; // G3
      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 0.6);

      window.setTimeout(() => {
        void ctx.close();
      }, 1200);
    } catch {
      try {
        await ctx.close();
      } catch {
        // ignore
      }
    }
  }

  async playInput(number: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch slightly higher per digit (350Hz - 600Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + number * 30, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);

      window.setTimeout(() => void ctx.close(), 200);
    } catch {
      // ignore
    }
  }

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
   * Played when a player completes a row, column, or 3x3 box.
   * Triumphant rising arpeggio chord.
   */
  async playUnitComplete() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });

      window.setTimeout(() => void ctx.close(), 600);
    } catch {
      // ignore
    }
  }

  /**
   * Played when you fire an attack / penalty to your opponent.
   * Energetic laser zap.
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
   * Played when the opponent hits you with a battle debuff.
   * Urgent warning impact / alarm sound.
   */
  async playAttacked() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;

      // Dual alarm pulses
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

      // Low rumble impact
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
   * Played when hitting consecutive correct answers in quick succession (Combo).
   */
  async playCombo(combo: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const baseFreq = 587.33; // D5
      const noteCount = Math.min(combo, 4);

      for (let i = 0; i < noteCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = combo >= 4 ? 'sawtooth' : 'triangle';
        const freq = baseFreq * Math.pow(1.2, i);
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.001, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.18);
      }

      window.setTimeout(() => void ctx.close(), 500);
    } catch {
      // ignore
    }
  }

  /**
   * Played on incorrect entry or consecutive mistakes.
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
      const baseFreq = level > 1 ? 110 : 140;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 0.75, now + 0.15);

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
   * Played on duel defeat.
   */
  async playDefeat() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();
      const now = ctx.currentTime;
      const notes = [392.0, 369.99, 329.63, 293.66]; // G4, F#4, E4, D4 descending

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0.001, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.1, now + idx * 0.18 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.38);
      });

      window.setTimeout(() => void ctx.close(), 1200);
    } catch {
      // ignore
    }
  }
}

export const soundEffects = new SoundEffects();

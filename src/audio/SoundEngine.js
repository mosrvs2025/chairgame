// Procedural WebAudio API Synthesizer & Spatial SFX Engine for SIT ON ME (ChairGame)

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.beatStep = 0;
    this.intensity = 0; // 0 = stealth groove, 1 = intercept tension, 2 = danger/boss
    this.lastScootTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
      this.musicPlaying = false;
    } else if (this.enabled) {
      this.init();
      this.startMusic();
    }
    return this.enabled;
  }

  startMusic() {
    if (!this.enabled) return;
    this.init();
    if (this.musicPlaying) return;
    this.musicPlaying = true;

    // 124 BPM sneaky spy-jazz + synth-funk bassline
    const stepMs = 120;
    const bassScale = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98.0];
    const tensionArp = [440, 523.25, 659.25, 587.33, 659.25, 783.99, 659.25, 523.25];

    this.musicTimer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const step = this.beatStep % 16;

      // Walking sneaky upright bass on even steps
      if (step % 2 === 0) {
        const freq = bassScale[(step / 2) % bassScale.length] * (this.intensity === 2 ? 1.122 : 1);
        this.synthNote(freq, 'triangle', now, 0.16, 0.07, 650);
      }

      // Brushed hi-hat tick
      if (step % 2 === 1) {
        this.noiseBurst(now, 0.035, 0.018, 5200);
      }

      // Intercept / Tension arpeggio when someone is lowering their glutes or danger is active
      if (this.intensity >= 1 && (step % 2 === 0 || this.intensity === 2)) {
        const arpFreq = tensionArp[step % tensionArp.length] * (this.intensity === 2 ? 1.059 : 1);
        this.synthNote(arpFreq, 'sine', now, 0.09, 0.03, 1800);
      }

      this.beatStep++;
    }, stepMs);
  }

  synthNote(freq, type, startTime, duration, gainVal, filterCutoff = 2000) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  noiseBurst(startTime, duration, gainVal, filterFreq = 1200) {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(2.0, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
  }

  playScoot(speedRatio = 0.5) {
    if (!this.enabled) return;
    this.init();
    const now = performance.now();
    if (now - this.lastScootTime < 140) return;
    this.lastScootTime = now;

    const t = this.ctx.currentTime;
    this.noiseBurst(t, 0.055, 0.03 * Math.min(1, speedRatio), 600 + speedRatio * 500);
  }

  playDash() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    this.noiseBurst(t, 0.22, 0.11, 1400);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.18);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  playHop() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.14);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  playFreeze() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    this.synthNote(587.33, 'sine', t, 0.1, 0.06, 2200);
    this.synthNote(880, 'sine', t + 0.06, 0.15, 0.05, 2200);
  }

  playSabotage() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    // Wood crack + wrench snap
    this.noiseBurst(t, 0.16, 0.18, 900);
    this.synthNote(140, 'square', t, 0.12, 0.12, 800);
    this.synthNote(95, 'sawtooth', t + 0.08, 0.18, 0.14, 600);
  }

  playSitCatch(isPerfect = false) {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    // Cushion poof
    this.noiseBurst(t, 0.18, 0.12, 420);

    // Rich chord
    const notes = isPerfect ? [261.63, 329.63, 392.0, 493.88, 587.33, 783.99] : [261.63, 329.63, 392.0, 523.25];
    notes.forEach((f, idx) => {
      this.synthNote(f, isPerfect ? 'triangle' : 'sine', t + idx * 0.045, 0.45, 0.09, 3200);
    });
  }

  playSiphonTick(progress = 0.5) {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const freq = 340 + progress * 560;
    this.synthNote(freq, 'sine', t, 0.09, 0.045, 2400);
  }

  playSitComplete() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, i) => {
      this.synthNote(f, 'triangle', t + i * 0.07, 0.38, 0.11, 4000);
    });
  }

  playCatapult() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    // Whoopee / spring boing + launch whistle
    this.noiseBurst(t, 0.25, 0.18, 320);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.38);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.44);
  }

  playAlert() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    this.synthNote(784, 'sawtooth', t, 0.12, 0.14, 3500);
    this.synthNote(740, 'sawtooth', t + 0.12, 0.22, 0.14, 3500);
  }

  playMorph() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    [220, 330, 440, 660, 880].forEach((f, i) => {
      this.synthNote(f, 'sine', t + i * 0.035, 0.2, 0.07, 3000);
    });
  }

  playVictory() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.synthNote(f, 'triangle', t + i * 0.08, 0.55, 0.12, 4200);
    });
  }
}

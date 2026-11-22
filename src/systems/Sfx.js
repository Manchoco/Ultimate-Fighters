// Bruitages synthétisés en direct avec la Web Audio API (aucun fichier, aucun droit d'auteur)
// + lecture des musiques (fichiers libres de droits dans public/assets/audio).
let ctx = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem('uf_muted') === '1'; } catch (e) { /* stockage indisponible */ }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(c, dur) {
  const len = Math.floor(c.sampleRate * dur);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.4, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.12, vol = 0.4, freq = 1200, q = 0.8, type = 'bandpass', sweep = null, delay = 0 }) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource(); s.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t);
}

export const Sfx = {
  unlock() { ac(); },
  isMuted() { return muted; },
  toggleMute(scene) {
    muted = !muted;
    try { localStorage.setItem('uf_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = muted ? 0 : 0.55;
    if (scene) scene.sound.mute = muted;
    return muted;
  },
  whoosh(heavy = false) { noise({ dur: heavy ? 0.22 : 0.13, vol: 0.25, freq: heavy ? 700 : 1600, sweep: heavy ? 250 : 500, q: 1.2 }); },
  hit(power = 1) {
    tone({ type: 'sine', f0: 160 * power, f1: 45, dur: 0.18, vol: 0.7 });
    noise({ dur: 0.09, vol: 0.55, freq: 2500, type: 'highpass', q: 0.5 });
    tone({ type: 'square', f0: 90, f1: 40, dur: 0.08, vol: 0.18 });
  },
  heavyHit() {
    tone({ type: 'sine', f0: 120, f1: 30, dur: 0.35, vol: 0.9 });
    noise({ dur: 0.2, vol: 0.6, freq: 900, sweep: 150, q: 0.7 });
  },
  block() { tone({ type: 'triangle', f0: 1400, f1: 900, dur: 0.07, vol: 0.25 }); noise({ dur: 0.05, vol: 0.25, freq: 4000, type: 'highpass' }); },
  jump() { tone({ type: 'sine', f0: 220, f1: 420, dur: 0.12, vol: 0.15 }); },
  land() { noise({ dur: 0.06, vol: 0.2, freq: 300, type: 'lowpass' }); },
  special() {
    tone({ type: 'sawtooth', f0: 200, f1: 900, dur: 0.25, vol: 0.18 });
    noise({ dur: 0.3, vol: 0.2, freq: 2000, sweep: 6000, q: 2 });
  },
  zap() { tone({ type: 'square', f0: 1800, f1: 200, dur: 0.2, vol: 0.15 }); noise({ dur: 0.18, vol: 0.25, freq: 5000, type: 'highpass' }); },
  arrow() { noise({ dur: 0.16, vol: 0.3, freq: 3000, sweep: 800, q: 3 }); },
  superStart() {
    tone({ type: 'sawtooth', f0: 80, f1: 600, dur: 0.6, vol: 0.25 });
    tone({ type: 'sine', f0: 40, f1: 40, dur: 0.6, vol: 0.5 });
    noise({ dur: 0.7, vol: 0.25, freq: 400, sweep: 8000, q: 1 });
  },
  explosion() { noise({ dur: 0.6, vol: 0.7, freq: 600, sweep: 60, type: 'lowpass' }); tone({ type: 'sine', f0: 90, f1: 25, dur: 0.6, vol: 0.8 }); },
  ko() {
    tone({ type: 'sine', f0: 300, f1: 60, dur: 0.9, vol: 0.5 });
    noise({ dur: 0.9, vol: 0.4, freq: 800, sweep: 100, type: 'lowpass' });
  },
  // ---------- Ambiances d'arène ----------
  blip(f0, f1, dur, vol, delay = 0, type = 'sine') { tone({ type, f0, f1, dur, vol, delay }); },
  drum(v = 1) {
    tone({ type: 'sine', f0: 140, f1: 60, dur: 0.18, vol: 0.12 * v });
    noise({ dur: 0.05, vol: 0.05 * v, freq: 2500, type: 'bandpass', q: 1.5 });
  },
  crowd(power = 1) { noise({ dur: 1.2, vol: 0.12 * power, freq: 900, sweep: 600, q: 0.6 }); },
  crash() {
    noise({ dur: 0.35, vol: 0.45, freq: 1800, sweep: 400, q: 0.8 });
    tone({ type: 'triangle', f0: 600, f1: 200, dur: 0.15, vol: 0.15 });
  },
  // bruit continu filtré (vagues, cascade, foule) ; renvoie un objet avec stop()
  ambientNoise({ type = 'lowpass', freq = 600, vol = 0.05, lfo = 0 }) {
    const c = ac(); if (!c) return null;
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 2); src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    let osc = null;
    if (lfo) { // houle : le volume monte et descend lentement
      osc = c.createOscillator(); const og = c.createGain();
      osc.frequency.value = lfo; og.gain.value = vol * 0.8;
      osc.connect(og).connect(g.gain); osc.start();
    }
    src.start();
    return { stop() { try { src.stop(); osc && osc.stop(); } catch (e) { /* déjà arrêté */ } } };
  },
  select() { tone({ type: 'triangle', f0: 660, f1: 990, dur: 0.09, vol: 0.25 }); },
  move() { tone({ type: 'triangle', f0: 520, f1: 520, dur: 0.04, vol: 0.12 }); },
  confirm() { tone({ type: 'triangle', f0: 523, dur: 0.1, vol: 0.25 }); tone({ type: 'triangle', f0: 784, dur: 0.18, vol: 0.25, delay: 0.09 }); },
  // Annonceur : synthèse vocale du navigateur (voix française si disponible)
  announce(text) {
    if (muted || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR'; u.rate = 0.95; u.pitch = 0.6; u.volume = 1;
      const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.startsWith('fr'));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* pas de voix : on continue sans */ }
  },
};

// Musique : un seul morceau à la fois, en boucle, avec fondu.
export const Music = {
  current: null,
  key: null,
  play(scene, key, volume = 0.35, loop = true) {
    if (this.key === key && this.current && this.current.isPlaying) return;
    this.stop(scene);
    if (!scene.cache.audio.exists(key)) return;
    this.key = key;
    this.current = scene.sound.add(key, { loop, volume: 0 });
    this.current.play();
    scene.tweens.add({ targets: this.current, volume, duration: 800 });
  },
  stop(scene) {
    if (this.current) {
      const s = this.current;
      this.current = null; this.key = null;
      if (scene && scene.tweens) scene.tweens.add({ targets: s, volume: 0, duration: 400, onComplete: () => s.destroy() });
      else s.destroy();
    }
  },
};

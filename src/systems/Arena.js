import Phaser from 'phaser';
import { Sfx } from './Sfx.js';

// Vie des arènes : ambiance animée propre à chaque lieu, sons d'ambiance,
// public qui réagit, et objets posés au sol qui se brisent quand on y est projeté.

const R = Phaser.Math.Between;

// Positions en fraction de la largeur / hauteur du panorama
const STAGE_FX = {
  basilique: { birds: 0xffffff, rays: true, props: ['jar', 'crate'] },
  phare: { birds: 0xffffff, beam: { x: 0.62, y: 0.16 }, sparkle: { y0: 0.30, y1: 0.42 }, ambience: 'waves', props: ['crate', 'barrel'] },
  tambour: { lanterns: true, ambience: 'drums', crowd: true, props: ['jar', 'drum', 'jar'] },
  cascades: { mist: [0.16, 0.27, 0.55, 0.76], mistY: 0.62, ambience: 'water', props: ['jar', 'crate'] },
  ebimpe: { flashes: { y0: 0.28, y1: 0.62 }, ambience: 'crowd', crowd: true, props: ['crate', 'barrel'] },
  lune: { fireflies: true, moon: { x: 0.885, y: 0.10 }, props: ['jar', 'drum'] },
  foret: { leaves: 0x6cae3a, chirps: true, elephant: true, props: ['jar', 'crate'] },
  palais: { petals: 0xffb0c8, birds: 0x222222, props: ['jar', 'barrel'] },
};

export class Arena {
  constructor(scene, stageId) {
    this.scene = scene;
    this.cfg = STAGE_FX[stageId] || {};
    this.W = scene.worldW;
    this.t = 0;
    this.props = [];
    this.sounds = [];
    this.timers = [];
    this.build();
  }

  every(ms, fn) { const ev = this.scene.time.addEvent({ delay: ms, loop: true, callback: fn }); this.timers.push(ev); return ev; }

  build() {
    const s = this.scene; const c = this.cfg; const W = this.W;
    if (c.birds) this.every(2600, () => this.bird(c.birds));
    if (c.rays) {
      for (let i = 0; i < 4; i++) {
        const r = s.add.rectangle(W * (0.3 + i * 0.12), -40, 70, 900, 0xfff3c0, 0.06).setAngle(18).setDepth(2).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0.5, 0);
        s.tweens.add({ targets: r, alpha: { from: 0.4, to: 1 }, yoyo: true, repeat: -1, duration: 2500 + i * 400 });
      }
    }
    if (c.beam) {
      // faisceau du phare qui balaie le paysage
      this.beam = s.add.triangle(W * c.beam.x, 720 * c.beam.y, 0, 0, 900, -60, 900, 60, 0xfff6c0, 0.18).setOrigin(0, 0.5).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    }
    if (c.sparkle) this.every(120, () => {
      const p = s.add.star(R(0, W), 720 * Phaser.Math.FloatBetween(c.sparkle.y0, c.sparkle.y1), 4, 1, 5, 0xffffff, 0.9).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: p, alpha: 0, scale: 1.8, duration: 500, onComplete: () => p.destroy() });
    });
    if (c.lanterns) {
      for (let i = 0; i < 10; i++) {
        const g = s.add.circle(W * (0.08 + i * 0.09), 720 * Phaser.Math.FloatBetween(0.35, 0.5), 18, 0xffb040, 0.25).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
        s.tweens.add({ targets: g, alpha: { from: 0.4, to: 1 }, scale: { from: 0.8, to: 1.2 }, yoyo: true, repeat: -1, duration: R(500, 900) });
      }
    }
    if (c.mist) this.every(90, () => {
      const x = W * Phaser.Utils.Array.GetRandom(c.mist) + R(-30, 30);
      const p = s.add.circle(x, 720 * c.mistY, R(14, 30), 0xffffff, 0.35).setDepth(2);
      s.tweens.add({ targets: p, y: p.y - R(40, 110), x: x + R(-40, 40), scale: 2.2, alpha: 0, duration: R(900, 1500), onComplete: () => p.destroy() });
    });
    if (c.flashes) this.every(160, () => {
      if (Math.random() < 0.5) return;
      const p = s.add.circle(R(0, W), 720 * Phaser.Math.FloatBetween(c.flashes.y0, c.flashes.y1), R(4, 9), 0xffffff, 1).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: p, alpha: 0, scale: 2, duration: 160, onComplete: () => p.destroy() });
    });
    if (c.fireflies) {
      for (let i = 0; i < 26; i++) {
        const f = s.add.circle(R(0, W), R(250, 600), 3, 0xfff59a, 0.8).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
        s.tweens.add({ targets: f, x: f.x + R(-80, 80), y: f.y + R(-60, 60), alpha: { from: 0.1, to: 0.9 }, yoyo: true, repeat: -1, duration: R(1500, 3200) });
      }
    }
    if (c.moon) {
      const m = s.add.circle(W * c.moon.x, 720 * c.moon.y, 80, 0xd8e4ff, 0.12).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: m, scale: { from: 1, to: 1.25 }, alpha: { from: 0.6, to: 1 }, yoyo: true, repeat: -1, duration: 3000 });
    }
    const fall = c.leaves || c.petals;
    if (fall) this.every(260, () => {
      const p = s.add.ellipse(R(0, W), -10, 12, 6, fall, 0.9).setDepth(30);
      s.tweens.add({ targets: p, y: 700, x: p.x + R(-150, 150), angle: R(180, 720), duration: R(3500, 6000), onComplete: () => p.destroy() });
    });
    if (c.chirps) this.every(3100, () => { if (Math.random() < 0.6) this.chirp(); });
    if (c.elephant) this.every(17000, () => this.trumpet());
    if (c.ambience) this.startAmbience(c.ambience);
    this.spawnProps();
  }

  bird(color) {
    const s = this.scene; const dir = Math.random() < 0.5 ? 1 : -1;
    const cam = s.cameras.main; const x0 = dir > 0 ? cam.scrollX - 40 : cam.scrollX + 1320;
    const g = s.add.text(x0, R(60, 220), 'v', { fontFamily: 'Arial', fontSize: '26px', color: Phaser.Display.Color.IntegerToColor(color).rgba }).setDepth(3);
    s.tweens.add({ targets: g, x: x0 + dir * 1500, y: g.y + R(-60, 60), duration: R(6000, 9000), onComplete: () => g.destroy() });
    s.tweens.add({ targets: g, scaleY: 0.4, yoyo: true, repeat: -1, duration: 180 });
  }

  chirp() { for (let i = 0; i < 3; i++) Sfx.blip(2600 + Math.random() * 1400, 3800 + Math.random() * 800, 0.06, 0.05, i * 0.09); }

  trumpet() {
    // barrissement d'éléphant (synthétisé)
    Sfx.blip(320, 520, 0.9, 0.12, 0, 'sawtooth');
    Sfx.blip(520, 380, 0.6, 0.09, 0.5, 'sawtooth');
  }

  startAmbience(kind) {
    const map = { waves: { type: 'lowpass', freq: 500, vol: 0.05, lfo: 0.15 }, water: { type: 'lowpass', freq: 900, vol: 0.06, lfo: 0 }, crowd: { type: 'bandpass', freq: 700, vol: 0.05, lfo: 0.4 } };
    if (map[kind]) { const n = Sfx.ambientNoise(map[kind]); if (n) this.sounds.push(n); }
    if (kind === 'drums') {
      // rythme de djembé (synthétisé) en fond
      let step = 0;
      const pattern = [1, 0, 0.5, 0, 1, 0.5, 0, 0.5];
      this.every(170, () => { const v = pattern[step++ % pattern.length]; if (v) Sfx.drum(v); });
    }
  }

  // Le public réagit aux gros coups (stade, marché)
  cheer(power = 1) { if (this.cfg.crowd) Sfx.crowd(power); }

  // ---------- Objets cassables ----------
  spawnProps() {
    const s = this.scene; const mid = this.W / 2;
    const kinds = this.cfg.props || ['jar', 'crate'];
    const xs = [mid - 560, mid + 560, mid - 900, mid + 900];
    kinds.forEach((k, i) => {
      const x = xs[i % xs.length]; const y = s.groundY;
      const c = s.add.container(x, y).setDepth(7);
      let w = 70, h = 80, colors = [0xa8643a, 0x7a4426];
      if (k === 'jar') { // canari en terre cuite
        c.add(s.add.ellipse(0, -40, 72, 70, 0xa8643a)); c.add(s.add.ellipse(0, -78, 34, 16, 0x7a4426)); c.add(s.add.rectangle(0, -40, 60, 6, 0xd9a06a));
      } else if (k === 'drum') { // djembé
        w = 60; h = 110; colors = [0x6b3f1f, 0xe8d8b0];
        c.add(s.add.rectangle(0, -30, 40, 60, 0x6b3f1f)); c.add(s.add.ellipse(0, -80, 66, 50, 0x8a5a2e)); c.add(s.add.ellipse(0, -104, 64, 14, 0xe8d8b0));
      } else if (k === 'barrel') {
        w = 70; h = 100; colors = [0x5a4a3a, 0x9a8a6a];
        c.add(s.add.rectangle(0, -50, 66, 100, 0x6a5440)); c.add(s.add.rectangle(0, -80, 70, 8, 0x333333)); c.add(s.add.rectangle(0, -20, 70, 8, 0x333333));
      } else { // caisse en bois
        w = 80; h = 80; colors = [0x9a6b3a, 0x6a4520];
        c.add(s.add.rectangle(0, -40, 80, 80, 0x9a6b3a).setStrokeStyle(4, 0x6a4520)); c.add(s.add.rectangle(0, -40, 80, 8, 0x6a4520).setAngle(45)); c.add(s.add.rectangle(0, -40, 80, 8, 0x6a4520).setAngle(-45));
      }
      c.addAt(s.add.ellipse(0, 2, w + 20, 14, 0x000000, 0.3), 0);
      this.props.push({ c, x, w, h, colors, alive: true });
    });
  }

  breakProp(p, f) {
    const s = this.scene;
    p.alive = false;
    s.fx.rocks(p.x, s.groundY, p.colors[0], 14);
    s.fx.rocks(p.x, s.groundY, p.colors[1], 6);
    s.fx.dust(p.x, s.groundY, 1);
    s.cameras.main.shake(120, 0.006);
    Sfx.crash();
    s.tweens.add({ targets: p.c, alpha: 0, scaleY: 0.2, duration: 120, onComplete: () => p.c.setVisible(false) });
    if (f === s.p2) { s.addScore(1000); s.fx.floatText(p.x, s.groundY - 160, '+1000', '#ffd23a', 28); }
    f.vx *= 0.5; // l'objet amortit la chute
    this.cheer(1.2);
  }

  update(dt) {
    this.t += dt;
    if (this.beam) this.beam.setAngle(180 + Math.sin(this.t / 1800) * 60);
    // un combattant projeté (ou K.O.) qui traverse un objet le casse
    for (const f of [this.scene.p1, this.scene.p2]) {
      if (!['airhit', 'ko', 'down'].includes(f.state)) continue;
      const moving = Math.abs(f.vx) > 90 || f.vy > 300; // glisse ou retombe
      if (!moving) continue;
      for (const p of this.props) {
        const top = this.scene.groundY - p.h;
        // le corps (≈ 200 px sous la tête quand il vrille) touche l'objet
        if (p.alive && Math.abs(f.x - p.x) < p.w / 2 + 70 && f.y > top - 90) this.breakProp(p, f);
      }
    }
  }

  resetRound() { this.props.forEach((p) => { p.alive = true; p.c.setVisible(true).setAlpha(1).setScale(1); }); }

  destroy() {
    this.timers.forEach((t) => t.remove());
    this.sounds.forEach((n) => n.stop());
  }
}

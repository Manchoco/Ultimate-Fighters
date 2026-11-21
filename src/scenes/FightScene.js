import Phaser from 'phaser';
import { Fighter, BODY_H, MAX_SUPER } from '../systems/Fighter.js';
import { Effects } from '../systems/Effects.js';
import { AI } from '../systems/AI.js';
import { Sfx, Music } from '../systems/Sfx.js';
import { fighterById } from '../data/fighters.js';
import { STAGES } from '../data/stages.js';

const ROUND_TIME = 99;
const ROUNDS_TO_WIN = 2;

export class FightScene extends Phaser.Scene {
  constructor() { super('Fight'); }

  init(data) {
    this.cfg = data; // { p1, p2, stage, mode, level, ladder, ladderIndex }
    this.round = 1;
    this.phase = 'intro';
    this.projectiles = [];
    this.hitstop = 0;
    this.slowmo = 1;
    this.freezeFor = null;
    this.camLock = false;
    this.combo = { count: 0, t: 0, owner: null };
    this.paused = false;
  }

  create() {
    const W = this.scale.width;
    this.stageData = STAGES.find((s) => s.id === this.cfg.stage) || STAGES[0];
    this.bg = this.add.image(0, 0, `st_${this.stageData.id}`).setOrigin(0, 0).setDepth(0);
    this.worldW = this.bg.width;
    this.groundY = this.stageData.groundY;
    this.cameras.main.setBounds(0, 0, this.worldW, 720);
    this.cameras.main.setBackgroundColor('#000');
    // léger voile pour détacher les combattants du décor
    this.add.rectangle(0, 0, this.worldW, 720, 0x000000, 0.12).setOrigin(0).setDepth(1);

    this.fx = new Effects(this);
    const mid = this.worldW / 2;
    this.p1 = new Fighter(this, fighterById(this.cfg.p1), mid - 260, 1, false);
    this.p2 = new Fighter(this, fighterById(this.cfg.p2), mid + 260, -1, true);
    this.p1.opponent = this.p2; this.p2.opponent = this.p1;
    this.ai = new AI(this.p2, this.cfg.level);
    this.leftBound = 0; this.rightBound = this.worldW;
    this.cameras.main.scrollX = mid - W / 2;

    this.scene.launch('HUD', { fight: this });
    this.hud = this.scene.get('HUD');
    Music.play(this, this.stageData.music, 0.3);

    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.events.once('shutdown', () => { this.scene.stop('HUD'); });

    // le HUD doit être prêt avant d'annoncer le round
    this.time.delayedCall(50, () => this.startRound());
  }

  // ---------- Déroulement des rounds ----------
  startRound() {
    const mid = this.worldW / 2;
    for (const [f, x, face] of [[this.p1, mid - 260, 1], [this.p2, mid + 260, -1]]) {
      f.hp = 1000; f.x = x; f.y = this.groundY; f.vx = 0; f.vy = 0; f.facing = face;
      f.move = null; f.special = null; f.invuln = 0; f.counterActive = 0; f.shieldT = 0;
      f.rot = 0; f.spin = 0; f.bounced = false; f.koLanded = false; f.flash = 0;
      f.cool.s1 = 0; f.cool.s2 = 0; f.sprite.setAlpha(1);
      f.setState('intro');
    }
    this.projectiles.forEach((p) => p.gfx.destroy()); this.projectiles = [];
    this.timeLeft = ROUND_TIME;
    this.phase = 'intro';
    this.time.timeScale = 1; this.tweens.timeScale = 1; this.slowmo = 1;
    const final = this.p1.wins === 1 && this.p2.wins === 1;
    const label = final ? 'ROUND FINAL' : `ROUND ${this.round}`;
    this.hud.banner(label, '#ffffff', 1100);
    Sfx.announce(final ? 'Round final' : `Round ${this.round}`);
    this.time.delayedCall(1300, () => {
      this.hud.banner('COMBATTEZ !', '#ffd23a', 800);
      Sfx.announce('Combattez !');
      this.p1.setState('idle'); this.p2.setState('idle');
      this.phase = 'fight';
    });
  }

  endRound(winner, reason) {
    if (this.phase !== 'fight') return;
    this.phase = 'end';
    const loser = winner ? winner.opponent : null;
    if (reason === 'ko') {
      Sfx.ko();
      this.hud.banner('K.O. !', '#ff3b3b', 1600);
      Sfx.announce('K.O.');
      this.slowmo = 0.35;
      this.time.delayedCall(450, () => { this.slowmo = 1; });
    } else {
      this.hud.banner(winner ? 'TEMPS ÉCOULÉ !' : 'ÉGALITÉ !', '#ffffff', 1600);
      Sfx.announce(winner ? 'Temps écoulé' : 'Égalité');
    }
    if (winner) winner.wins++;
    this.time.delayedCall(1500, () => {
      if (winner && winner.alive) { winner.setState('win'); this.hud.banner(`${winner.data.name.toUpperCase()} GAGNE !`, '#ffd23a', 1400); }
      if (loser && loser.alive && reason !== 'ko') loser.setState('idle');
    });
    this.time.delayedCall(3400, () => {
      if (this.p1.wins >= ROUNDS_TO_WIN || this.p2.wins >= ROUNDS_TO_WIN) {
        const playerWon = this.p1.wins >= ROUNDS_TO_WIN;
        Music.stop(this);
        this.scene.stop('HUD');
        this.scene.start('Result', { ...this.cfg, playerWon });
      } else {
        this.round++;
        this.startRound();
      }
    });
  }

  togglePause() {
    if (this.phase === 'end') return;
    this.paused = !this.paused;
    if (this.paused) { this.time.paused = true; this.tweens.pauseAll(); this.hud.showPause(true); }
    else { this.time.paused = false; this.tweens.resumeAll(); this.hud.showPause(false); }
  }

  quitToMenu() {
    this.paused = false; this.time.paused = false; this.tweens.resumeAll();
    Music.stop(this);
    this.scene.stop('HUD');
    this.scene.start('Title');
  }

  // ---------- Impacts ----------
  applyHit(att, def, hit) {
    if (this.phase !== 'fight') return 'none'; // aucun coup ne compte hors du combat (intro, fin de round)
    const res = def.receive(hit, att);
    if (res === 'none' || res === 'countered') return res;
    const cx = (def.x + att.x) / 2 + att.facing * 20;
    const cy = def.y - BODY_H * (hit.band === 'low' ? 0.2 : 0.62);
    if (res === 'blocked') {
      if (!hit.projectile && att.grounded && (def.x <= this.leftBound + 70 || def.x >= this.rightBound - 70)) att.vx = -att.facing * (hit.knock || 150) * 0.6;
      this.fx.spark(cx, cy, 0xbfe0ff, false);
      Sfx.block();
      att.superM = Math.min(MAX_SUPER, att.superM + 3);
      return res;
    }
    // dans le coin, c'est l'attaquant qui recule (comme dans les jeux de combat)
    if (!hit.projectile && att.grounded && (def.x <= this.leftBound + 70 || def.x >= this.rightBound - 70)) att.vx = -att.facing * (hit.knock || 150) * 0.8;
    const color = hit.color || 0xffe38a;
    this.fx.spark(cx, cy, color, !!hit.heavy);
    if (hit.heavy) { Sfx.heavyHit(); this.cameras.main.shake(140, 0.01); } else Sfx.hit(1 + Math.random() * 0.3);
    this.hitstop = hit.heavy ? 110 : 60;
    att.superM = Math.min(MAX_SUPER, att.superM + hit.dmg * 0.18);
    // combo
    if (this.combo.owner === att && this.time.now - this.combo.t < 900) this.combo.count++;
    else { this.combo.owner = att; this.combo.count = 1; }
    this.combo.t = this.time.now;
    if (this.combo.count >= 2) this.hud.comboText(att === this.p1 ? 'left' : 'right', this.combo.count);
    if (!def.alive) this.endRound(att, 'ko');
    return res;
  }

  showMoveName(f, name, color) {
    const c = Phaser.Display.Color.IntegerToColor(color).rgba;
    this.fx.floatText(f.x, f.y - BODY_H - 50, name.toUpperCase(), c, 30);
  }

  // ---------- Projectiles et attaques spéciales ----------
  spawnProjectile(owner, sp) {
    const y = owner.y - BODY_H * 0.62;
    const x = owner.x + owner.facing * 90;
    const g = this.add.container(x, y).setDepth(20);
    if (sp.arrow) {
      const glow = this.add.ellipse(0, 0, 130, 26, sp.color, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      const shaft = this.add.rectangle(0, 0, 90, 5, sp.color).setBlendMode(Phaser.BlendModes.ADD);
      const head = this.add.triangle(48 * owner.facing, 0, 0, -10, 0, 10, 22 * owner.facing, 0, 0xffffff);
      g.add([glow, shaft, head]);
    } else {
      const glow = this.add.circle(0, 0, 46, sp.color, 0.3).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(0, 0, 24, sp.color, 0.9).setBlendMode(Phaser.BlendModes.ADD);
      const white = this.add.circle(0, 0, 11, 0xffffff, 1);
      g.add([glow, core, white]);
      this.tweens.add({ targets: glow, scale: { from: 0.8, to: 1.25 }, yoyo: true, repeat: -1, duration: 120 });
    }
    this.projectiles.push({ owner, x, y, vx: owner.facing * (sp.arrow ? 1250 : 860), gfx: g, dmg: sp.short ? 85 : 70, life: sp.short ? 0.45 : 2.2, color: sp.color, alive: true, trailT: 0 });
  }

  spawnRain(owner, color, count, dmg, isSuper = false) {
    const target = owner.opponent;
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * (isSuper ? 120 : 140), () => {
        if (this.phase !== 'fight') return;
        const x = target.x + Phaser.Math.Between(-90, 90);
        const bolt = this.add.rectangle(x, -40, isSuper ? 18 : 8, isSuper ? 160 : 90, color, 1).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
        const glow = this.add.rectangle(x, -40, isSuper ? 60 : 26, isSuper ? 200 : 110, color, 0.3).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: [bolt, glow], y: this.groundY - 40, duration: 260, ease: 'Quad.easeIn',
          onComplete: () => {
            bolt.destroy(); glow.destroy();
            this.fx.spark(x, this.groundY - 30, color, isSuper);
            if (isSuper) { Sfx.zap(); this.cameras.main.shake(80, 0.006); } else Sfx.arrow();
            const r = new Phaser.Geom.Rectangle(x - 45, 0, 90, 720);
            if (target.alive && Phaser.Geom.Intersects.RectangleToRectangle(r, target.hurtbox())) {
              const last = i === count - 1;
              this.applyHit(owner, target, { dmg: dmg * owner.powerMul, hitstun: 380, blockstun: 160, knock: 60, color, unblockable: isSuper, projectile: true, heavy: isSuper && last, launch: isSuper && last });
            }
          },
        });
      });
    }
  }

  spawnBeam(owner, color) {
    const y = owner.y - BODY_H * 0.6;
    const x0 = owner.x + owner.facing * 70;
    const len = 1600;
    const beam = this.add.rectangle(x0, y, len, 120, color, 0.85).setOrigin(owner.facing > 0 ? 0 : 1, 0.5).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.rectangle(x0, y, len, 44, 0xffffff, 1).setOrigin(owner.facing > 0 ? 0 : 1, 0.5).setDepth(23).setBlendMode(Phaser.BlendModes.ADD);
    beam.scaleY = 0.1; core.scaleY = 0.1;
    this.tweens.add({ targets: [beam, core], scaleY: 1, duration: 120 });
    Sfx.explosion();
    this.cameras.main.shake(700, 0.008);
    let n = 0;
    this.time.addEvent({
      delay: 110, repeat: 6, callback: () => {
        n++;
        const o = owner.opponent;
        const r = new Phaser.Geom.Rectangle(owner.facing > 0 ? x0 : x0 - len, y - 60, len, 120);
        if (o.alive && Phaser.Geom.Intersects.RectangleToRectangle(r, o.hurtbox())) {
          this.applyHit(owner, o, { dmg: n === 7 ? 80 : 33, hitstun: 450, knock: n === 7 ? 500 : 40, color, unblockable: true, heavy: n === 7, launch: n === 7 });
        }
      },
    });
    this.time.delayedCall(820, () => this.tweens.add({ targets: [beam, core], scaleY: 0, alpha: 0, duration: 160, onComplete: () => { beam.destroy(); core.destroy(); } }));
  }

  superCinematic(f, then) {
    const cam = this.cameras.main;
    this.freezeFor = f; // l'adversaire est figé pendant l'annonce
    this.camLock = true;
    const dark = this.add.rectangle(0, 0, this.worldW, 720, 0x000000, 0).setOrigin(0).setDepth(15);
    this.tweens.add({ targets: dark, fillAlpha: 0.6, duration: 150 });
    Sfx.superStart();
    Sfx.announce(f.data.sup.name);
    this.hud.superSplash(f, f === this.p1 ? 'left' : 'right');
    cam.zoomTo(1.25, 250, 'Quad.easeOut', true);
    cam.pan(f.x, f.y - 200, 250, 'Quad.easeOut', true);
    this.fx.burst(f.x, f.y - 180, f.data.sup.color, 30);
    this.time.delayedCall(900, () => {
      this.freezeFor = null;
      cam.zoomTo(1, 200, 'Quad.easeIn', true);
      this.tweens.add({ targets: dark, fillAlpha: 0, duration: 300, onComplete: () => dark.destroy() });
      this.time.delayedCall(220, () => { this.camLock = false; });
      then();
    });
  }

  // ---------- Boucle principale ----------
  update(time, deltaRaw) {
    if (this.paused) return;
    const ctrl = this.hud && this.hud.controls ? this.hud.controls.update() : null;
    if (this.hud && this.hud.controls) this.hud.controls.setSuperReady(this.p1.superM >= MAX_SUPER);
    let dt = Math.min(deltaRaw, 50) * this.slowmo;
    if (this.hitstop > 0) { this.hitstop -= deltaRaw; dt = 0; }

    if (this.phase === 'fight' && dt > 0) {
      if (!this.freezeFor) {
        if (ctrl) this.p1.input(ctrl);
        this.p2.input(this.ai.update(dt));
      }
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        const a = this.p1.hp, b = this.p2.hp;
        this.endRound(a === b ? null : a > b ? this.p1 : this.p2, 'time');
      }
    }

    // Bornes : les combattants restent visibles à l'écran
    const W = this.scale.width;
    const midX = (this.p1.x + this.p2.x) / 2;
    const camX = Phaser.Math.Clamp(midX - W / 2, 0, this.worldW - W);
    this.leftBound = camX + 20; this.rightBound = camX + W - 20;

    for (const f of [this.p1, this.p2]) {
      if (this.freezeFor && f !== this.freezeFor) { f.render(); continue; }
      f.update(dt);
    }

    // Les corps ne se traversent pas
    if (dt > 0) {
      const a = this.p1, b = this.p2;
      const overlapX = 100 - Math.abs(a.x - b.x);
      if (overlapX > 0 && Math.abs(a.y - b.y) < 200 && a.alive && b.alive && !a.lying && !b.lying) {
        const dir = a.x < b.x ? -1 : a.x > b.x ? 1 : (a.facing > 0 ? -1 : 1);
        a.x += dir * overlapX / 2; b.x -= dir * overlapX / 2;
        a.x = Phaser.Math.Clamp(a.x, this.leftBound + 55, this.rightBound - 55);
        b.x = Phaser.Math.Clamp(b.x, this.leftBound + 55, this.rightBound - 55);
      }
    }

    this.updateProjectiles(dt);

    if (!this.camLock) {
      const cam = this.cameras.main;
      cam.scrollX += (camX - cam.scrollX) * 0.15;
      cam.scrollY = 0;
    }
    if (this.hud) this.hud.refresh();
  }

  updateProjectiles(dt) {
    const s = dt / 1000;
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.x += p.vx * s; p.life -= s;
      p.gfx.setPosition(p.x, p.y);
      p.trailT += dt;
      if (p.trailT > 30) {
        p.trailT = 0;
        const tr = this.add.circle(p.x, p.y, 14, p.color, 0.5).setDepth(19).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: tr, alpha: 0, scale: 0.3, duration: 220, onComplete: () => tr.destroy() });
      }
      const target = p.owner.opponent;
      const box = new Phaser.Geom.Rectangle(p.x - 30, p.y - 30, 60, 60);
      if (target.alive && target.invuln <= 0 && Phaser.Geom.Intersects.RectangleToRectangle(box, target.hurtbox())) {
        this.applyHit(p.owner, target, { dmg: p.dmg * p.owner.powerMul, hitstun: 360, blockstun: 220, knock: 220, color: p.color, projectile: true });
        p.alive = false;
      }
      // deux projectiles qui se croisent s'annulent
      for (const q of this.projectiles) {
        if (p.alive && q !== p && q.alive && q.owner !== p.owner && Math.abs(q.x - p.x) < 50 && Math.abs(q.y - p.y) < 80) {
          q.alive = false; p.alive = false; this.fx.spark((p.x + q.x) / 2, p.y, 0xffffff, true); Sfx.explosion();
          this.fx.burst(q.x, q.y, q.color, 6); q.gfx.destroy(); q.dead = true;
        }
      }
      if (p.life <= 0 || p.x < this.leftBound - 100 || p.x > this.rightBound + 100) p.alive = false;
      if (!p.alive && !p.dead) { p.dead = true; this.fx.burst(p.x, p.y, p.color, 6); p.gfx.destroy(); }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }
}

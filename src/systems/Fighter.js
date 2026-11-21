import Phaser from 'phaser';
import { Sfx } from './Sfx.js';

// Un combattant. L'illustration est fixe : les mouvements (respiration, marche,
// coups, impacts, chute) sont animés par transformations + effets visuels.

export const BODY_W = 110;
export const BODY_H = 300;
export const DISPLAY_H = 360;
const GRAVITY = 2600;
const JUMP_V = -1150;
export const MAX_HP = 1000;
export const MAX_SUPER = 100;

// Coups normaux : temps en ms, portée en px devant le corps.
const MOVES = {
  punch: { startup: 70, active: 90, recovery: 150, dmg: 45, reach: 125, lunge: 22, tilt: 7, hitstun: 260, blockstun: 160, knock: 140, band: 'high' },
  kick: { startup: 120, active: 110, recovery: 230, dmg: 65, reach: 160, lunge: 30, tilt: 14, hitstun: 320, blockstun: 200, knock: 220, band: 'mid', heavy: true },
  low: { startup: 90, active: 100, recovery: 220, dmg: 50, reach: 150, lunge: 24, tilt: 10, hitstun: 300, blockstun: 180, knock: 160, band: 'low' },
  air: { startup: 60, active: 260, recovery: 80, dmg: 60, reach: 140, lunge: 16, tilt: 18, hitstun: 300, blockstun: 180, knock: 180, band: 'high' },
};

export class Fighter {
  constructor(scene, data, x, facing, isCpu) {
    this.scene = scene;
    this.data = data;
    this.isCpu = isCpu;
    this.x = x; this.y = scene.groundY; this.vx = 0; this.vy = 0;
    this.facing = facing; // +1 = regarde à droite
    this.hp = MAX_HP; this.superM = 0;
    this.state = 'idle'; this.stateT = 0; this.t = Math.random() * 10;
    this.move = null; this.moveHit = false; this.special = null;
    this.cool = { s1: 0, s2: 0 };
    this.invuln = 0; this.flash = 0;
    this.counterActive = 0; this.shieldT = 0;
    this.holdingBack = false;
    this.wins = 0;
    this.opponent = null;
    this.speed = 230 + data.stats.speed * 28;
    this.powerMul = 0.8 + data.stats.power * 0.1;
    this.defMul = 1.15 - data.stats.defense * 0.075;

    const key = `f_${data.id}`;
    this.shadow = scene.add.ellipse(x, this.y, 150, 26, 0x000000, 0.38).setDepth(5);
    this.aura = scene.add.ellipse(x, this.y - BODY_H / 2, 200, 380, data.color, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.sprite = scene.add.image(x, this.y, key).setOrigin(0.5, 1).setDepth(10);
    this.baseScale = DISPLAY_H / this.sprite.height;
    this.sprite.setScale(this.baseScale);
  }

  get grounded() { return this.y >= this.scene.groundY - 0.5 && this.vy >= 0; }
  get alive() { return this.hp > 0; }
  get crouching() { return this.state === 'crouch' || (this.state === 'attack' && this.move && this.move.name === 'low'); }
  get busy() { return ['attack', 'special', 'hit', 'ko', 'super', 'win', 'intro'].includes(this.state); }

  hurtbox() {
    const h = this.crouching ? BODY_H * 0.64 : BODY_H;
    return new Phaser.Geom.Rectangle(this.x - BODY_W / 2, this.y - h, BODY_W, h);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // ---------- Actions déclenchées par le joueur ou l'IA ----------
  input(ctrl) {
    if (!this.alive || this.state === 'block') return;
    this.holdingBack = (this.facing > 0 && ctrl.left) || (this.facing < 0 && ctrl.right);
    if (this.busy) return;

    if (ctrl.sup && this.superM >= MAX_SUPER && this.grounded) { this.startSuper(); return; }
    if (ctrl.s1 && this.cool.s1 <= 0 && this.grounded) { this.startSpecial('s1'); return; }
    if (ctrl.s2 && this.cool.s2 <= 0 && this.grounded) { this.startSpecial('s2'); return; }
    if (ctrl.punch || ctrl.kick) {
      if (!this.grounded) { this.startMove('air'); return; }
      if (ctrl.down) { this.startMove('low'); return; }
      this.startMove(ctrl.punch ? 'punch' : 'kick');
      return;
    }
    if (!this.grounded) return; // pas de contrôle en l'air

    if (ctrl.up) {
      this.vy = JUMP_V;
      this.vx = (ctrl.right ? 1 : ctrl.left ? -1 : 0) * this.speed * 1.05;
      this.setState('jump'); Sfx.jump();
      return;
    }
    if (ctrl.down) { this.vx = 0; if (this.state !== 'crouch') this.setState('crouch'); return; }
    const dir = ctrl.right ? 1 : ctrl.left ? -1 : 0;
    this.vx = dir * (this.holdingBack ? this.speed * 0.72 : this.speed);
    const ns = dir !== 0 ? 'walk' : 'idle';
    if (this.state !== ns) this.setState(ns);
  }

  startMove(name) {
    const m = MOVES[name];
    this.move = { name, ...m, total: m.startup + m.active + m.recovery };
    this.moveHit = false;
    if (name !== 'air') this.vx = 0;
    this.setState('attack');
    Sfx.whoosh(!!m.heavy);
  }

  startSpecial(slot) {
    const sp = this.data[slot];
    this.cool[slot] = 1100;
    this.special = { slot, ...sp, dur: 480 };
    this.moveHit = false;
    this.vx = 0;
    this.setState('special');
    Sfx.special();
    this.scene.showMoveName(this, sp.name, sp.color);
    this.scene.fx.burst(this.x + this.facing * 40, this.y - 200, sp.color, 10);
    switch (sp.type) {
      case 'dash': this.special.dur = 420; break;
      case 'uppercut': this.special.dur = 620; this.invuln = 220; break;
      case 'heavy': this.special.dur = 720; break;
      case 'spin': this.special.dur = 640; break;
      case 'grab': this.special.dur = 520; break;
      case 'counter': this.special.dur = 700; this.counterActive = 600; break;
      case 'shield': this.special.dur = 380; this.shieldT = 1600; this.scene.fx.shield(this); break;
      case 'teleport': {
        this.special.dur = 560;
        this.scene.fx.burst(this.x, this.y - 150, sp.color, 18);
        this.sprite.setAlpha(0.15);
        this.scene.time.delayedCall(180, () => {
          this.sprite.setAlpha(1);
          if (this.state !== 'special') return;
          const o = this.opponent;
          this.x = Phaser.Math.Clamp(o.x - o.facing * 140, this.scene.leftBound + 60, this.scene.rightBound - 60);
          this.facing = this.x < o.x ? 1 : -1;
          this.scene.fx.burst(this.x, this.y - 150, sp.color, 18);
          Sfx.zap();
        });
        break;
      }
      case 'rain':
        this.special.dur = 520;
        this.scene.time.delayedCall(250, () => { if (this.alive) this.scene.spawnRain(this, sp.color, 5, 55); });
        break;
      case 'projectile':
      default:
        this.special.dur = 480;
        this.scene.time.delayedCall(170, () => {
          if (this.state !== 'special') return;
          this.scene.spawnProjectile(this, sp);
          if (sp.arrow) Sfx.arrow(); else Sfx.zap();
        });
    }
  }

  startSuper() {
    this.superM = 0;
    this.setState('super');
    this.invuln = 99999;
    this.vx = 0;
    this.scene.superCinematic(this, () => {
      const sup = this.data.sup;
      const o = this.opponent;
      if (!this.alive || !o.alive) { this.endSuper(); return; }
      if (sup.type === 'beam') {
        this.scene.spawnBeam(this, sup.color);
        this.scene.time.delayedCall(900, () => this.endSuper());
      } else if (sup.type === 'storm') {
        this.scene.spawnRain(this, sup.color, 9, 38, true);
        this.scene.time.delayedCall(1300, () => this.endSuper());
      } else {
        // rush : fonce sur l'adversaire puis rafale de coups
        const target = Phaser.Math.Clamp(o.x - this.facing * 120, this.scene.leftBound + 60, this.scene.rightBound - 60);
        this.scene.tweens.add({
          targets: this, x: target, duration: 220, ease: 'Quad.easeIn',
          onUpdate: () => this.scene.fx.ghost(this, sup.color),
          onComplete: () => {
            let n = 0;
            this.scene.time.addEvent({
              delay: 110, repeat: 6, callback: () => {
                n++;
                this.lungePulse = 1;
                const last = n === 7;
                this.scene.applyHit(this, o, { dmg: last ? 90 : 32, hitstun: 450, knock: last ? 520 : 30, heavy: last, unblockable: true, color: sup.color, launch: last, fromSuper: true });
              },
            });
            this.scene.time.delayedCall(950, () => this.endSuper());
          },
        });
      }
    });
  }

  endSuper() { if (this.state === 'super') { this.invuln = 0; this.setState('idle'); } }

  // ---------- Réception des coups ----------
  receive(hit, attacker) {
    if (!this.alive) return 'none';
    if (this.invuln > 0) return 'none';
    if (this.counterActive > 0 && !hit.projectile && !hit.unblockable) {
      this.counterActive = 0;
      this.scene.showMoveName(this, 'CONTRE !', 0xffffff);
      this.scene.applyHit(this, attacker, { dmg: 120, hitstun: 500, knock: 420, heavy: true, unblockable: true, color: this.data.s2.color, launch: true });
      return 'countered';
    }
    let dmg = hit.dmg * this.defMul;
    if (this.shieldT > 0 && !hit.unblockable) dmg *= 0.2;
    const canBlock = !hit.unblockable && this.holdingBack && !this.busy && this.grounded;
    const lowOk = hit.band !== 'low' || this.crouching;
    if (canBlock && lowOk) {
      this.hp = Math.max(1, this.hp - dmg * 0.12);
      this.superM = Math.min(MAX_SUPER, this.superM + 4);
      this.setState('block'); this.blockT = hit.blockstun || 180;
      this.vx = -this.facing * (hit.knock || 120) * 0.6;
      return 'blocked';
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.superM = Math.min(MAX_SUPER, this.superM + dmg * 0.12);
    this.flash = 60;
    this.hitT = hit.hitstun || 280;
    this.vx = -this.facing * (hit.knock || 150);
    if (hit.launch) this.vy = -700;
    if (this.state === 'super') this.invuln = 0;
    this.move = null; this.special = null; this.counterActive = 0;
    if (this.hp <= 0) { this.vy = -820; this.vx = -this.facing * 420; this.setState('ko'); }
    else this.setState('hit');
    return 'hit';
  }

  // ---------- Boucle ----------
  update(dt) {
    const s = dt / 1000;
    this.t += s; this.stateT += dt;
    this.cool.s1 -= dt; this.cool.s2 -= dt;
    if (this.invuln > 0 && this.invuln < 99999) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.counterActive > 0) this.counterActive -= dt;
    if (this.shieldT > 0) this.shieldT -= dt;
    const opp = this.opponent;

    // Toujours face à l'adversaire quand on est libre au sol
    if (opp && !this.busy && this.grounded && this.state !== 'block') this.facing = opp.x >= this.x ? 1 : -1;

    switch (this.state) {
      case 'attack': this.updateAttack(); break;
      case 'special': this.updateSpecial(); break;
      case 'hit': if (this.stateT > this.hitT && this.grounded) this.setState('idle'); else if (this.grounded) this.vx *= 0.88; break;
      case 'block': if (this.stateT > this.blockT) this.setState('idle'); this.vx *= 0.85; break;
      case 'ko': if (this.grounded) this.vx *= 0.85; break;
      case 'win': case 'intro': this.vx = 0; break;
      default: break;
    }

    // Physique
    if (this.y < this.scene.groundY || this.vy < 0) {
      this.vy += GRAVITY * s;
      this.y += this.vy * s;
      if (this.y >= this.scene.groundY) {
        this.y = this.scene.groundY; this.vy = 0;
        if (this.state === 'jump' || (this.state === 'attack' && this.move && this.move.name === 'air')) { this.move = null; this.setState('idle'); Sfx.land(); }
        if (this.state === 'ko') { Sfx.land(); this.scene.cameras.main.shake(180, 0.006); }
      }
    }
    this.x += this.vx * s;
    if (this.state === 'idle' || this.state === 'crouch' || this.state === 'win') this.vx = 0;
    this.x = Phaser.Math.Clamp(this.x, this.scene.leftBound + BODY_W / 2, this.scene.rightBound - BODY_W / 2);

    this.render();
  }

  updateAttack() {
    const m = this.move;
    if (!m) { this.setState(this.grounded ? 'idle' : 'jump'); return; }
    const t = this.stateT;
    if (t >= m.startup && t < m.startup + m.active && !this.moveHit) {
      const box = this.attackBox(m.reach, m.band);
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, this.opponent.hurtbox())) {
        this.moveHit = true;
        this.scene.applyHit(this, this.opponent, { dmg: m.dmg * this.powerMul, hitstun: m.hitstun, blockstun: m.blockstun, knock: m.knock, band: m.band, heavy: m.heavy });
      }
    }
    if (t >= m.total || (m.name === 'air' && this.grounded && t > 60)) { this.move = null; this.setState(this.grounded ? 'idle' : 'jump'); }
  }

  updateSpecial() {
    const sp = this.special;
    if (!sp) { this.setState('idle'); return; }
    const t = this.stateT; const f = this.facing;
    const tryHit = (reach, hit, band = 'mid') => {
      if (this.moveHit) return;
      const box = this.attackBox(reach, band);
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, this.opponent.hurtbox())) {
        this.moveHit = true;
        this.scene.applyHit(this, this.opponent, { ...hit, dmg: hit.dmg * this.powerMul, color: sp.color });
      }
    };
    switch (sp.type) {
      case 'dash':
        if (t > 80 && t < 330) { this.vx = f * 1150; this.scene.fx.ghost(this, sp.color); tryHit(110, { dmg: 85, hitstun: 380, blockstun: 220, knock: 360 }); } else this.vx = 0;
        break;
      case 'uppercut':
        if (t > 60 && t < 140 && this.grounded) { this.vy = -1050; this.vx = f * 220; }
        if (t > 60 && t < 380) { this.scene.fx.ghost(this, sp.color); tryHit(120, { dmg: 105, hitstun: 520, blockstun: 240, knock: 260, launch: true, heavy: true }, 'high'); }
        if (t > 300 && this.grounded) this.vx = 0;
        break;
      case 'heavy':
        if (t > 330 && t < 430) tryHit(190, { dmg: 140, hitstun: 560, blockstun: 320, knock: 480, heavy: true, launch: true });
        if (t > 330 && t < 350) this.scene.cameras.main.shake(120, 0.008);
        break;
      case 'spin':
        if (t > 60 && t < 560) {
          this.vx = f * 620; this.scene.fx.ghost(this, sp.color);
          if (!this.moveHit) {
            tryHit(90, { dmg: 40, hitstun: 300, blockstun: 160, knock: 140 });
            if (this.moveHit) this.lastSpinHit = t;
          } else if (t - this.lastSpinHit > 150) this.moveHit = false; // touches multiples
        } else this.vx = 0;
        break;
      case 'grab':
        if (t > 120 && t < 260) tryHit(95, { dmg: 130, hitstun: 600, knock: 520, unblockable: true, heavy: true, launch: true });
        break;
      case 'teleport':
        if (t > 260 && t < 420) tryHit(130, { dmg: 80, hitstun: 400, blockstun: 200, knock: 300 });
        break;
      default: break;
    }
    if (t >= sp.dur && this.grounded) { this.vx = 0; this.special = null; this.setState('idle'); }
  }

  attackBox(reach, band = 'mid') {
    const front = this.x + this.facing * (BODY_W / 2 - 10);
    const x = this.facing > 0 ? front : front - reach;
    let top = this.y - BODY_H; let h = BODY_H;
    if (band === 'low') { top = this.y - 110; h = 110; }
    if (band === 'high') { top = this.y - BODY_H; h = BODY_H * 0.75; }
    return new Phaser.Geom.Rectangle(x, top, reach, h);
  }

  // ---------- Rendu (poses procédurales) ----------
  render() {
    const sp = this.sprite; const f = this.facing;
    let ox = 0, oy = 0, ang = 0, sx = 1, sy = 1;
    const t = this.t;
    switch (this.state) {
      case 'idle': case 'intro': sy = 1 + Math.sin(t * 4.2) * 0.012; sx = 1 - Math.sin(t * 4.2) * 0.006; ang = Math.sin(t * 2.1) * 0.8 * f; break;
      case 'walk': oy = -Math.abs(Math.sin(t * 11)) * 7; ang = (this.vx >= 0 ? 1 : -1) * (2.5 + Math.sin(t * 11) * 2); break;
      case 'crouch': sy = 0.7; sx = 1.08; break;
      case 'jump': ang = (this.vy < 0 ? -6 : 4) * f; sy = this.vy < 0 ? 1.04 : 0.98; break;
      case 'block': sx = 0.95; ox = -f * 8; ang = -f * 4; break;
      case 'hit': ang = -f * 12; ox = -f * 6; sx = 0.97; break;
      case 'ko': ang = -f * Math.min(85, this.stateT / 7); oy = this.grounded ? 10 : 0; break;
      case 'win': oy = -Math.abs(Math.sin(t * 6)) * 14; sy = 1.02; break;
      case 'super': sy = 1.04 + Math.sin(t * 30) * 0.01; ox = (this.lungePulse || 0) * f * 30; ang = (this.lungePulse || 0) * f * 10; break;
      case 'attack': {
        const m = this.move; if (!m) break;
        const tt = this.stateT;
        let k;
        if (tt < m.startup) k = -0.35 * (tt / m.startup);
        else if (tt < m.startup + m.active) k = 1;
        else k = 1 - (tt - m.startup - m.active) / m.recovery;
        ox = f * m.lunge * k; ang = f * m.tilt * k; sx = 1 + 0.06 * Math.max(0, k);
        if (m.name === 'low') { sy = 0.72; sx = 1.1 + 0.05 * k; ang = f * 6 * k; }
        if (m.name === 'air') ang = f * 20;
        break;
      }
      case 'special': {
        const s2 = this.special; if (!s2) break;
        const tt = this.stateT;
        if (s2.type === 'projectile') { ox = f * (tt < 170 ? -10 : 28); ang = f * (tt < 170 ? -6 : 10); sx = tt < 170 ? 0.96 : 1.06; }
        else if (s2.type === 'heavy') { ang = tt < 330 ? -f * 14 * (tt / 330) : f * 18; ox = tt < 330 ? -f * 12 : f * 40; }
        else if (s2.type === 'uppercut') { ang = -f * 10; sy = 1.08; }
        else if (s2.type === 'spin') ang = f * ((tt * 1.4) % 360);
        else if (s2.type === 'counter') { sx = 0.96; ang = -f * 3; }
        else if (s2.type === 'grab') { ox = f * (tt > 120 && tt < 260 ? 34 : 0); ang = f * 8; }
        else if (s2.type === 'dash') { ang = f * 12; sx = 1.12; sy = 0.95; }
        else { ox = f * 18; ang = f * 8; }
        break;
      }
      default: break;
    }
    if (this.lungePulse) this.lungePulse = Math.max(0, this.lungePulse - 0.15);

    sp.setPosition(this.x + ox, this.y + oy);
    sp.setFlipX(f < 0);
    sp.setScale(this.baseScale * sx, this.baseScale * sy);
    sp.setAngle(ang);
    if (this.flash > 0) sp.setTintFill(0xffffff);
    else if (this.state === 'block') sp.setTint(0xb9d4ff);
    else if (this.state === 'hit') sp.setTint(0xff9a9a);
    else if (this.counterActive > 0) sp.setTint(0xfff1b0);
    else sp.clearTint();

    const sc = Phaser.Math.Clamp(1 - (this.scene.groundY - this.y) / 600, 0.4, 1);
    this.shadow.setPosition(this.x, this.scene.groundY + 4).setScale(sc);
    const glow = this.state === 'super' ? 0.35 : this.superM >= MAX_SUPER ? 0.1 + Math.sin(t * 8) * 0.05 : this.shieldT > 0 ? 0.22 : 0;
    this.aura.setPosition(this.x, this.y - BODY_H / 2).setFillStyle(this.shieldT > 0 ? this.data.s2.color : this.data.color, Math.max(0, glow));
  }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.aura.destroy(); }
}

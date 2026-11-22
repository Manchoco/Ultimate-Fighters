import Phaser from 'phaser';
import { Sfx } from './Sfx.js';
import { MOVES as SPECIALS } from './Moves.js';

// Un combattant articulé : les poses (tête, bras, jambes) viennent d'une planche
// générée par déformation « marionnette » de l'illustration. La physique (gravité,
// projection, rebonds, glissade au sol, relevé) est simulée ici.

export const BODY_W = 110;
export const BODY_H = 300;
export const DISPLAY_H = 360;
const GRAVITY = 2700;
const JUMP_V = -1180;
export const MAX_HP = 1000;
export const MAX_SUPER = 100;

// Coups normaux : temps en ms, portée en px devant le corps.
const MOVES = {
  punch: { startup: 70, active: 90, recovery: 160, dmg: 45, reach: 135, lunge: 14, hitstun: 330, blockstun: 160, knock: 90, band: 'high', poses: ['punch0', 'punch1'] },
  kick: { startup: 110, active: 110, recovery: 240, dmg: 65, reach: 175, lunge: 18, hitstun: 380, blockstun: 200, knock: 170, band: 'mid', heavy: true, poses: ['kick0', 'kick1'] },
  low: { startup: 90, active: 100, recovery: 230, dmg: 50, reach: 165, lunge: 14, hitstun: 340, blockstun: 180, knock: 110, band: 'low', poses: ['crouch', 'low'], sweep: true },
  air: { startup: 60, active: 280, recovery: 80, dmg: 60, reach: 145, lunge: 8, hitstun: 300, blockstun: 180, knock: 200, band: 'high', poses: ['jump', 'airkick'] },
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
    this.bounced = false; this.spin = 0; this.lastHitBand = 'high';
    this.spinAngle = 0; this.shockT = 0; this.armorHits = 0; this.reflectT = 0; this.passThrough = false;
    this.wins = 0;
    this.opponent = null;
    this.speed = 230 + data.stats.speed * 28;
    this.powerMul = 0.8 + data.stats.power * 0.1;
    this.defMul = 1.15 - data.stats.defense * 0.075;
    // masse : les costauds encaissent les projections, les légers volent plus loin
    this.mass = 0.75 + data.stats.defense * 0.07 + data.stats.power * 0.05 - data.stats.speed * 0.03;

    this.rig = scene.cache.json.get('rigs')[data.id];
    this.frameIndex = Object.fromEntries(this.rig.frames.map((n, i) => [n, i]));
    this.shadow = scene.add.ellipse(x, this.y, 150, 26, 0x000000, 0.38).setDepth(5);
    this.aura = scene.add.ellipse(x, this.y - BODY_H / 2, 200, 380, data.color, 0).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.sprite = scene.add.sprite(x, this.y, `r_${data.id}`, 0).setOrigin(0.5, this.rig.originY).setDepth(10);
    this.baseScale = DISPLAY_H / this.rig.bodyHeight;
    this.sprite.setScale(this.baseScale);
  }

  get grounded() { return this.y >= this.scene.groundY - 0.5 && this.vy >= 0; }
  get alive() { return this.hp > 0; }
  get crouching() { return this.state === 'crouch' || (this.state === 'attack' && this.move && this.move.name === 'low'); }
  get busy() { return ['attack', 'special', 'hit', 'airhit', 'down', 'getup', 'ko', 'super', 'win', 'intro'].includes(this.state); }
  get lying() { return ['down', 'getup', 'ko'].includes(this.state) || this.state === 'airhit'; }

  hurtbox() {
    const h = this.crouching ? BODY_H * 0.64 : BODY_H;
    return new Phaser.Geom.Rectangle(this.x - BODY_W / 2, this.y - h, BODY_W, h);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // ---------- Actions déclenchées par le joueur ou l'IA ----------
  // Lit l'action demandée (avec une mémoire de 170 ms : un appui un peu trop tôt n'est pas perdu)
  readAction(ctrl) {
    const now = this.scene.time.now;
    let a = null;
    if (ctrl.sup) a = 'sup'; else if (ctrl.s1) a = 's1'; else if (ctrl.s2) a = 's2';
    else if (ctrl.punch || ctrl.kick) a = !this.grounded ? 'air' : ctrl.down ? 'low' : ctrl.punch ? 'punch' : 'kick';
    if (a) this.buffer = { a, t: now };
    else if (this.buffer && now - this.buffer.t < 170) a = this.buffer.a;
    return a;
  }

  // Annulations : un coup qui a touché (ou été paré) peut s'enchaîner sur un coup plus fort
  canCancelInto(a) {
    const m = this.move;
    if (this.state !== 'attack' || !m || !this.moveHit || m.name === 'air') return false;
    const t = this.stateT;
    if (t < m.startup || t > m.startup + m.active + m.recovery * 0.75) return false;
    const rank = { punch: 1, low: 2, kick: 3 };
    if (a === 's1' || a === 's2' || a === 'sup') return true;
    return (rank[a] || 0) > (rank[m.name] || 0);
  }

  doAction(a) {
    this.buffer = null;
    if (a === 'sup') { if (this.superM >= MAX_SUPER && this.grounded) { this.startSuper(); return true; } return false; }
    if (a === 's1' || a === 's2') { if (this.cool[a] <= 0 && this.grounded) { this.startSpecial(a); return true; } return false; }
    if (a === 'air') { if (!this.grounded) { this.startMove('air'); return true; } return false; }
    if (a) { this.startMove(a); return true; }
    return false;
  }

  input(ctrl) {
    if (!this.alive || this.state === 'block') return;
    this.holdingBack = (this.facing > 0 && ctrl.left) || (this.facing < 0 && ctrl.right);
    const a = this.readAction(ctrl);
    // un spécial qui a touché peut s'annuler en super (fin de combo spectaculaire)
    if (a === 'sup' && this.state === 'special' && this.moveHit && this.superM >= MAX_SUPER && this.grounded) {
      this.cancelSpecial(); this.buffer = null; this.startSuper(); this.scene.onCancel(this); return;
    }
    if (a && this.canCancelInto(a)) {
      if (this.doAction(a)) { this.scene.onCancel(this); return; }
    }
    if (this.busy) return;
    if (a && this.doAction(a)) return;
    if (!this.grounded) return; // pas de contrôle en l'air

    if (ctrl.up) {
      this.vy = JUMP_V;
      this.vx = (ctrl.right ? 1 : ctrl.left ? -1 : 0) * this.speed * 1.05;
      this.setState('jump'); Sfx.jump();
      this.scene.fx.dust(this.x, this.scene.groundY, 0.6);
      return;
    }
    if (ctrl.down) { this.vx = 0; if (this.state !== 'crouch') this.setState('crouch'); return; }
    const dir = ctrl.right ? 1 : ctrl.left ? -1 : 0;
    const target = dir * (this.holdingBack ? this.speed * 0.72 : this.speed);
    this.vx += (target - this.vx) * 0.35; // accélération progressive (pas de départ instantané)
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
    const def = SPECIALS[sp.id];
    this.cool[slot] = def.cool || 1200;
    this.special = { slot, ...sp, def, dur: def.dur, m: {} };
    this.moveHit = false;
    this.vx = 0;
    if (def.invuln) this.invuln = def.invuln;
    this.setState('special');
    Sfx.special();
    this.scene.showMoveName(this, sp.name, sp.color);
    this.scene.fx.burst(this.x + this.facing * 40, this.y - 200, sp.color, 10);
    if (def.start) def.start(this, this.special.m);
    if (this === this.scene.p1) this.scene.stats.p1.specials++;
  }

  // Coup au corps à corps pendant un spécial (une seule touche tant que moveHit est vrai)
  meleeHit(reach, hit, band = 'mid') {
    if (this.moveHit) return false;
    const box = this.attackBox(reach, band);
    if (Phaser.Geom.Intersects.RectangleToRectangle(box, this.opponent.hurtbox())) {
      this.moveHit = true;
      const color = this.special ? this.special.color : this.data.sup.color;
      this.scene.applyHit(this, this.opponent, { color, ...hit, dmg: hit.dmg * this.powerMul });
      return true;
    }
    return false;
  }

  cancelSpecial() {
    if (this.special && this.special.def.end) this.special.def.end(this);
    if (this.superMove && this.superMove.def.end) this.superMove.def.end(this);
    this.special = null; this.superMove = null; this.spinAngle = 0; this.armorHits = 0; this.passThrough = false;
  }

  startSuper() {
    this.superM = 0;
    this.setState('super');
    this.superPose = 'special';
    this.superMove = null;
    this.invuln = 99999;
    this.vx = 0;
    this.scene.superCinematic(this, () => {
      const def = SPECIALS[this.data.sup.id];
      if (!this.alive || !this.opponent.alive || this.state !== 'super') { this.endSuper(); return; }
      this.superMove = { def, m: {}, t: 0 };
      this.moveHit = false;
      def.start(this, this.superMove.m);
      // la fin est gérée dans update() sur le temps de jeu (cohérent même si l'appareil rame)
    });
  }

  endSuper() {
    if (this.superMove && this.superMove.def.end) this.superMove.def.end(this);
    this.superMove = null; this.spinAngle = 0; this.passThrough = false;
    if (this.state === 'super') { this.invuln = 0; this.setState(this.grounded ? 'idle' : 'jump'); }
  }

  // ---------- Réception des coups ----------
  receive(hit, attacker) {
    if (!this.alive) return 'none';
    if (this.invuln > 0) return 'none';
    if (this.counterActive > 0 && !hit.projectile && !hit.unblockable) {
      this.counterActive = 0;
      this.scene.showMoveName(this, 'CONTRE !', 0xffffff);
      this.scene.applyHit(this, attacker, { dmg: 120, hitstun: 500, knock: 460, heavy: true, unblockable: true, color: this.data.s2.color, launch: true });
      return 'countered';
    }
    let dmg = hit.dmg * this.defMul;
    // blindage (Crochet Bulldozer) : encaisse sans broncher
    if (this.armorHits > 0 && !hit.unblockable) {
      this.armorHits--; this.hp = Math.max(1, this.hp - dmg * 0.5); this.flash = 60;
      return 'armored';
    }
    if (this.shieldT > 0 && !hit.unblockable) dmg *= 0.2;
    const canBlock = !hit.unblockable && this.holdingBack && !this.busy && this.grounded;
    const lowOk = hit.band !== 'low' || this.crouching;
    let dir = attacker.x <= this.x ? 1 : -1; // sens de la poussée
    if (hit.throwOver) dir = -dir; // projeté par-dessus l'attaquant
    if (canBlock && lowOk) {
      this.hp = Math.max(1, this.hp - dmg * 0.12);
      this.superM = Math.min(MAX_SUPER, this.superM + 4);
      this.setState('block'); this.blockT = hit.blockstun || 180;
      this.vx = dir * (hit.knock || 120) * 0.7 / this.mass;
      return 'blocked';
    }
    this.hp = Math.max(this.scene.training ? 1 : 0, this.hp - dmg); // en entraînement, personne ne tombe K.O.
    this.superM = Math.min(MAX_SUPER, this.superM + dmg * 0.12);
    this.flash = 60;
    this.lastHitBand = hit.band === 'high' ? 'high' : 'mid';
    this.hitT = hit.hitstun || 280;
    this.cancelSpecial(); this.move = null; this.counterActive = 0;
    if (hit.shock) this.shockT = hit.shock;
    if (this.state === 'super') this.invuln = 0;
    const knock = (hit.knock || 150) / this.mass;
    const airborne = !this.grounded || this.state === 'airhit';
    if (airborne) {
      this.juggles = (this.juggles || 0) + 1;
      if (this.juggles >= 4) this.invuln = Math.max(this.invuln, 700); // on ne jongle pas à l'infini
    }
    if (this.hp <= 0) {
      // K.O. : projeté en arrière, il retombera et restera au sol
      this.vx = dir * Math.max(380, knock * 1.1); this.vy = -760 / Math.sqrt(this.mass);
      this.spin = dir * (220 + Math.random() * 80); this.bounced = false;
      this.setState('ko');
    } else if ((hit.launch || hit.sweep || airborne) && !hit.keepStanding) {
      // projection / jonglage
      this.vx = dir * knock * (hit.sweep ? 0.5 : 1);
      this.vy = hit.sweep ? -260 : -(hit.throwOver ? 1050 : hit.launch ? 820 : 520) / Math.sqrt(this.mass);
      if (hit.throwOver) this.vx = dir * 520;
      this.spin = dir * (hit.sweep ? 120 : 160 + Math.random() * 120); this.bounced = false;
      this.setState('airhit');
    } else {
      this.vx = dir * knock;
      this.setState('hit');
    }
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
    if (this.reflectT > 0) this.reflectT -= dt;
    if (this.shockT > 0) this.shockT -= dt;
    if (this.state === 'super' && this.superMove) {
      const sm = this.superMove;
      sm.t += dt;
      if (sm.def.update) sm.def.update(this, sm.t, sm.m);
      if (this.superMove === sm && sm.t >= sm.def.dur && this.grounded) this.endSuper();
    }
    const opp = this.opponent;

    // Toujours face à l'adversaire quand on est libre au sol
    if (opp && !this.busy && this.grounded && this.state !== 'block') this.facing = opp.x >= this.x ? 1 : -1;

    switch (this.state) {
      case 'attack': this.updateAttack(); break;
      case 'special': this.updateSpecial(); break;
      case 'hit': if (this.stateT > this.hitT) this.setState('idle'); break;
      case 'block': if (this.stateT > this.blockT) this.setState('idle'); break;
      case 'down':
        this.invuln = Math.max(this.invuln, 50);
        if (this.stateT > 650) { this.setState('getup'); }
        break;
      case 'getup':
        this.invuln = Math.max(this.invuln, 50);
        if (this.stateT > 380) { this.invuln = 250; this.setState('idle'); }
        break;
      case 'win': case 'intro': this.vx = 0; break;
      default: break;
    }

    // ----- Physique -----
    const ground = this.scene.groundY;
    if (this.y < ground || this.vy < 0) {
      this.vy += GRAVITY * s;
      this.y += this.vy * s;
      if (this.y >= ground) this.land();
    }
    // frottements au sol (glissade réaliste après un coup)
    if (this.y >= ground) {
      const fr = ['hit', 'block', 'attack'].includes(this.state) ? 0.86 : ['down', 'ko'].includes(this.state) ? 0.9 : null;
      if (fr !== null) this.vx *= Math.pow(fr, dt / 16.7);
      if (this.state === 'idle' || this.state === 'crouch' || this.state === 'win' || this.state === 'getup') this.vx = 0;
      if ((this.state === 'down' || this.state === 'ko') && Math.abs(this.vx) > 80 && Math.random() < 0.3) this.scene.fx.dust(this.x - this.facing * 80, ground, 0.3);
    }
    this.x += this.vx * s;
    // bords de l'écran : rebond contre le « mur » quand on est projeté fort
    const minX = this.scene.leftBound + BODY_W / 2, maxX = this.scene.rightBound - BODY_W / 2;
    if (this.x < minX || this.x > maxX) {
      if ((this.state === 'airhit' || this.state === 'ko') && Math.abs(this.vx) > 350) {
        this.vx = -this.vx * 0.35; this.scene.cameras.main.shake(120, 0.008); Sfx.heavyHit();
        this.scene.fx.dust(Phaser.Math.Clamp(this.x, minX, maxX), this.y - 150, 0.8);
      } else this.vx = 0;
      this.x = Phaser.Math.Clamp(this.x, minX, maxX);
    }
    if (this.state === 'airhit' || this.state === 'ko') this.rot = (this.rot || 0) + this.spin * s;

    this.render();
  }

  land() {
    const impact = this.vy;
    this.y = this.scene.groundY;
    if (this.state === 'airhit' || this.state === 'ko') {
      if (!this.bounced && impact > 450) {
        // premier contact : rebond amorti
        this.bounced = true;
        this.vy = -impact * 0.32;
        this.vx *= 0.7;
        this.scene.cameras.main.shake(140, 0.006 * Math.min(2, impact / 600) * this.mass);
        this.scene.fx.dust(this.x, this.scene.groundY, 1.2 * this.mass);
        Sfx.land(); Sfx.heavyHit();
        return;
      }
      this.vy = 0;
      this.scene.fx.dust(this.x, this.scene.groundY, 0.7);
      Sfx.land();
      this.juggles = 0;
      if (this.state === 'airhit') this.setState('down');
      else this.koLanded = true;
      return;
    }
    this.vy = 0;
    if (this.state === 'jump' || (this.state === 'attack' && this.move && this.move.name === 'air')) {
      this.move = null; this.setState('idle'); Sfx.land();
      this.landSquash = 1;
      if (impact > 900) this.scene.fx.dust(this.x, this.scene.groundY, 0.5 * this.mass);
      if (this.mass > 1.1 && impact > 900) this.scene.cameras.main.shake(80, 0.003);
    }
  }

  updateAttack() {
    const m = this.move;
    if (!m) { this.setState(this.grounded ? 'idle' : 'jump'); return; }
    const t = this.stateT;
    if (t >= m.startup && t < m.startup + m.active && !this.moveHit) {
      const box = this.attackBox(m.reach, m.band);
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, this.opponent.hurtbox())) {
        this.moveHit = true;
        this.scene.applyHit(this, this.opponent, { dmg: m.dmg * this.powerMul, hitstun: m.hitstun, blockstun: m.blockstun, knock: m.knock, band: m.band, heavy: m.heavy, sweep: m.sweep && Math.random() < 0.5 });
      }
    }
    if (t >= m.total || (m.name === 'air' && this.grounded && t > 60)) { this.move = null; this.setState(this.grounded ? 'idle' : 'jump'); }
  }

  updateSpecial() {
    const sp = this.special;
    if (!sp) { this.setState('idle'); return; }
    const t = this.stateT;
    if (sp.def.update) sp.def.update(this, t, sp.m);
    if (this.special === sp && t >= sp.dur && this.grounded) {
      if (sp.def.end) sp.def.end(this);
      this.vx = 0; this.special = null; this.spinAngle = 0; this.setState('idle');
    }
  }

  attackBox(reach, band = 'mid') {
    const front = this.x + this.facing * (BODY_W / 2 - 10);
    const x = this.facing > 0 ? front : front - reach;
    let top = this.y - BODY_H; let h = BODY_H;
    if (band === 'low') { top = this.y - 110; h = 110; }
    if (band === 'high') { top = this.y - BODY_H; h = BODY_H * 0.75; }
    return new Phaser.Geom.Rectangle(x, top, reach, h);
  }

  // ---------- Rendu : choix de la pose + petites transformations ----------
  pose() {
    const t = this.t; const tt = this.stateT;
    switch (this.state) {
      case 'idle': case 'intro': return Math.sin(t * 4.2) > 0 ? 'idle1' : 'idle0';
      case 'walk': return Math.floor(t * 7) % 2 ? 'walk1' : 'walk0';
      case 'crouch': return 'crouch';
      case 'jump': return 'jump';
      case 'block': return 'block';
      case 'hit': return this.lastHitBand === 'high' ? 'hit' : 'hitmid';
      case 'airhit': case 'down': case 'ko': return 'ko';
      case 'getup': return tt < 200 ? 'crouch' : 'idle0';
      case 'win': return 'win';
      case 'super': return this.superMove ? this.superMove.def.pose(this, this.superMove.t) : 'special';
      case 'attack': {
        const m = this.move; if (!m) return 'idle0';
        if (m.name === 'air') return tt < m.startup ? 'jump' : 'airkick';
        if (tt < m.startup) return m.poses[0];
        if (tt < m.startup + m.active + m.recovery * 0.5) return m.poses[1];
        return m.name === 'low' ? 'crouch' : m.poses[0];
      }
      case 'special': return this.special ? this.special.def.pose(this, tt) : 'idle0';
      default: return 'idle0';
    }
  }

  render() {
    const sp = this.sprite; const f = this.facing;
    const fi = this.frameIndex[this.pose()] ?? 0;
    if (sp.frame.name !== fi) sp.setFrame(fi);
    let ox = 0, oy = 0, ang = 0, sx = 1, sy = 1; const flipF = f;
    const tt = this.stateT;
    switch (this.state) {
      case 'walk': oy = -Math.abs(Math.sin(this.t * 14)) * 4; break;
      case 'attack': {
        const m = this.move; if (!m || m.name === 'air') break;
        const k = tt < m.startup ? 0 : tt < m.startup + m.active ? 1 : Math.max(0, 1 - (tt - m.startup - m.active) / m.recovery);
        ox = f * m.lunge * k;
        break;
      }
      case 'super': ox = (this.lungePulse || 0) * f * 26; break;
      case 'hit': ox = -f * 4 * Math.max(0, 1 - tt / 150); break;
      // corps projeté : il tourne en l'air puis s'allonge au sol (pivot aux pieds)
      case 'airhit': ang = -f * Phaser.Math.Clamp(Math.abs(this.rot || 0), 0, 82); break;
      case 'ko': ang = -f * Phaser.Math.Clamp(Math.abs(this.rot || 0), 0, 86); if (this.grounded) ang = -f * 86; break;
      case 'down': ang = -f * 84; break;
      case 'getup': ang = -f * 84 * Math.max(0, 1 - tt / 300); break;
      default: break;
    }
    if (this.state !== 'airhit' && this.state !== 'ko') this.rot = 0;
    if (this.spinAngle) {
      // rotation autour du centre du corps (et non des pieds)
      const h = DISPLAY_H * 0.45; const a = Phaser.Math.DegToRad(this.spinAngle);
      ang = this.spinAngle; ox += -h * Math.sin(a); oy += -h + h * Math.cos(a);
    }
    if (this.shockT > 0) { ox += Phaser.Math.Between(-5, 5); oy += Phaser.Math.Between(-3, 3); }
    if (this.lungePulse) this.lungePulse = Math.max(0, this.lungePulse - 0.15);
    if (this.landSquash) { sy = 1 - 0.08 * this.landSquash; sx = 1 + 0.05 * this.landSquash; this.landSquash = Math.max(0, this.landSquash - 0.12); }
    // respiration très légère pour ne jamais paraître figé
    if (this.state === 'idle') sy *= 1 + Math.sin(this.t * 4.2) * 0.006;

    sp.setPosition(this.x + ox, this.y + oy);
    sp.setFlipX(flipF < 0);
    sp.setScale(this.baseScale * sx, this.baseScale * sy);
    sp.setAngle(ang);
    if (this.flash > 0) sp.setTintFill(0xffffff);
    else if (this.shockT > 0) { if (Math.floor(this.shockT / 50) % 2) sp.setTintFill(0x9fdcff); else sp.setTint(0x6a7cff); }
    else if (this.armorHits > 0) sp.setTint(0xffc890);
    else if (this.state === 'block') sp.setTint(0xc4dcff);
    else if (this.state === 'hit' || this.state === 'airhit') sp.setTint(0xffb0b0);
    else if (this.counterActive > 0) sp.setTint(0xfff1b0);
    else if (this.state === 'getup' && Math.floor(tt / 60) % 2) sp.setTint(0xdddddd);
    else sp.clearTint();

    const lyingW = Math.abs(Math.sin(Phaser.Math.DegToRad(ang)));
    const sc = Phaser.Math.Clamp(1 - (this.scene.groundY - this.y) / 600, 0.4, 1);
    this.shadow.setPosition(this.x - f * lyingW * 150, this.scene.groundY + 4).setScale(sc * (1 + lyingW * 1.6), sc);
    const glow = this.state === 'super' ? 0.35 : this.superM >= MAX_SUPER ? 0.1 + Math.sin(this.t * 8) * 0.05 : this.shieldT > 0 ? 0.22 : 0;
    this.aura.setVisible(glow > 0.01).setPosition(this.x, this.y - BODY_H / 2).setFillStyle(this.shieldT > 0 ? this.data.s2.color : this.data.color, Math.max(0, glow));
  }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); this.aura.destroy(); }
}

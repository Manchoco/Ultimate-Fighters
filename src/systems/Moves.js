import Phaser from 'phaser';
import { Sfx } from './Sfx.js';
import { BODY_H } from './Fighter.js';

// Les 24 coups uniques du jeu (2 spéciaux + 1 super par combattant).
// Chaque coup définit :
//   dur   : durée totale (ms)          cool : temps de recharge (ms)
//   ai    : 'far' | 'mid' | 'close' | 'def' (quand l'ordinateur l'utilise)
//   pose(f, t)        : pose articulée à afficher à l'instant t
//   start(f, m)       : au déclenchement      update(f, t, m) : à chaque image
//   end(f)            : nettoyage (coup terminé ou interrompu)
// f = combattant, m = état du coup en cours, t = temps écoulé (ms)

const chestY = (f) => f.y - BODY_H * 0.62;

export const MOVES = {
  // ============================ MANCHOCO ============================
  // Arc électrique instantané : frappe à distance et électrocute (l'adversaire tremble)
  voltArc: {
    dur: 520, cool: 1300, ai: 'far',
    pose: (f, t) => (t < 160 ? 'punch0' : 'special'),
    update(f, t, m) {
      if (t < 160 || m.fired) return;
      m.fired = true;
      const o = f.opponent; const s = f.scene;
      const x0 = f.x + f.facing * 90, y0 = chestY(f);
      const dist = Math.abs(o.x - f.x);
      const inFront = Math.sign(o.x - f.x) === f.facing;
      const reach = 600;
      const touch = inFront && dist < reach;
      const x1 = touch ? o.x : x0 + f.facing * reach;
      const y1 = touch ? chestY(o) : y0 + Phaser.Math.Between(-40, 40);
      s.fx.lightning(x0, y0, x1, y1, 0x8fd0ff, 6, 260);
      Sfx.zap();
      if (touch) s.applyHit(f, o, { dmg: 75 * f.powerMul, hitstun: 520, blockstun: 220, knock: 90, color: 0x8fd0ff, shock: 520, projectile: true });
    },
  },
  // Ruée qui traverse l'adversaire et finit derrière lui
  voltRush: {
    dur: 460, cool: 1400, ai: 'mid',
    pose: (f, t) => (t < 90 ? 'punch0' : 'punch1'),
    start(f) { f.passThrough = true; },
    update(f, t) {
      if (t > 90 && t < 360) {
        f.vx = f.facing * 1350;
        f.scene.fx.ghost(f, 0x5fb4ff);
        if (Math.random() < 0.5) f.scene.fx.lightning(f.x - f.facing * 60, f.y - Phaser.Math.Between(60, 260), f.x - f.facing * 160, f.y - Phaser.Math.Between(60, 260), 0x5fb4ff, 3, 90);
        f.meleeHit(80, { dmg: 85, hitstun: 420, blockstun: 220, knock: 220, shock: 300 });
      } else { f.vx *= 0.6; if (t >= 360) f.passThrough = false; }
    },
    end(f) { f.passThrough = false; },
  },
  // Super : la foudre s'abat 7 fois du ciel sur l'adversaire
  stormAbidjan: {
    dur: 1700, pose: (f, t) => (t < 300 ? 'special' : 'win'),
    start(f) {
      const s = f.scene;
      const veil = s.add.rectangle(0, 0, s.worldW, 720, 0x0a1030, 0).setOrigin(0).setDepth(14);
      s.tweens.add({ targets: veil, fillAlpha: 0.55, duration: 200, yoyo: true, hold: 1100, onComplete: () => veil.destroy() });
      for (let i = 0; i < 7; i++) {
        s.time.delayedCall(250 + i * 170, () => {
          const o = f.opponent; if (!o.alive) return;
          const x = o.x + Phaser.Math.Between(-50, 50);
          const last = i === 6;
          s.fx.lightning(x + Phaser.Math.Between(-80, 80), -20, x, s.groundY - 10, 0xbfe6ff, last ? 14 : 8, 200);
          s.fx.flash(0xbfe6ff, 0.35, 90);
          Sfx.zap(); s.cameras.main.shake(90, 0.008);
          if (Math.abs(o.x - x) < 90) s.applyHit(f, o, { dmg: last ? 90 : 34, hitstun: 450, knock: last ? 480 : 20, unblockable: true, color: 0xbfe6ff, heavy: last, launch: last, keepStanding: !last, shock: 300, projectile: true });
        });
      }
    },
  },

  // ============================ LE DOYEN ============================
  // Onde dorée en éventail, courte portée, repousse très loin
  goldPalm: {
    dur: 540, cool: 1200, ai: 'mid',
    pose: (f, t) => (t < 150 ? 'punch0' : 'special'),
    update(f, t, m) {
      if (t < 150 || m.fired) return;
      m.fired = true;
      const s = f.scene; const o = f.opponent;
      s.fx.fanWave(f.x + f.facing * 70, chestY(f), f.facing, 0xffcf40, 300);
      Sfx.special(); s.cameras.main.shake(100, 0.005);
      const d = (o.x - f.x) * f.facing;
      if (d > 0 && d < 330 && Math.abs(o.y - f.y) < 220) s.applyHit(f, o, { dmg: 70 * f.powerMul, hitstun: 380, blockstun: 260, knock: 760, color: 0xffcf40, heavy: true });
    },
  },
  // Contre : s'il est frappé pendant la garde, il riposte aussitôt
  sageCounter: {
    dur: 720, cool: 1500, ai: 'def',
    pose: () => 'block',
    start(f) { f.counterActive = 620; f.scene.fx.yinRing(f, 0xffcf40, 620); },
  },
  // Super : une main de bronze géante traverse l'écran
  bronzeHands: {
    dur: 1300, pose: (f, t) => (t < 250 ? 'punch0' : 'special'),
    start(f) {
      const s = f.scene;
      s.time.delayedCall(250, () => {
        s.spawnProjectile(f, {
          color: 0xffb020, speed: 760, dmg: 260, life: 2.4, w: 260, h: 320, pierceProjectiles: true, unblockable: true, heavy: true, launch: true, y: f.y - BODY_H * 0.55,
          draw: (scn, g, facing) => {
            const glow = scn.add.ellipse(0, 0, 330, 380, 0xffb020, 0.25).setBlendMode(Phaser.BlendModes.ADD);
            const palm = scn.add.ellipse(-facing * 20, 30, 190, 210, 0xffc040, 0.85).setBlendMode(Phaser.BlendModes.ADD);
            const fingers = [-80, -40, 0, 40].map((dy, i) => scn.add.ellipse(facing * 95, dy - 20, 120, 38 - i * 2, 0xffd060, 0.9).setBlendMode(Phaser.BlendModes.ADD));
            const thumb = scn.add.ellipse(facing * 20, 120, 46, 110, 0xffd060, 0.9).setAngle(facing * 30).setBlendMode(Phaser.BlendModes.ADD);
            g.add([glow, palm, ...fingers, thumb]);
          },
        });
        Sfx.explosion(); s.cameras.main.shake(400, 0.006);
      });
    },
  },

  // ============================ AKISSI ============================
  // Ciseau de la Panthère : saut vrillé en salto, pied en avant
  pantherScissor: {
    dur: 680, cool: 1200, ai: 'close', invuln: 200,
    pose: (f, t) => (t < 70 ? 'crouch' : 'kick1'),
    update(f, t) {
      if (t > 70 && t < 150 && f.grounded) { f.vy = -1120; f.vx = f.facing * 260; }
      if (t > 70 && t < 560) {
        f.spinAngle = f.facing * Math.min(360, (t - 70) * 0.9);
        f.scene.fx.ghost(f, 0xffd36b);
        f.meleeHit(120, { dmg: 100, hitstun: 520, blockstun: 240, knock: 260, launch: true, heavy: true }, 'high');
      }
      if (t >= 560) f.spinAngle = 0;
      if (t > 300 && f.grounded) f.vx = 0;
    },
    end(f) { f.spinAngle = 0; },
  },
  // Roue acrobatique : elle roule en avant, touches multiples
  cartwheel: {
    dur: 660, cool: 1300, ai: 'mid',
    pose: () => 'kick1',
    update(f, t, m) {
      if (t > 60 && t < 580) {
        f.vx = f.facing * 640;
        f.spinAngle = f.facing * ((t - 60) * 1.25);
        if (!f.moveHit) { f.meleeHit(90, { dmg: 38, hitstun: 300, blockstun: 160, knock: 120, keepStanding: true }); if (f.moveHit) m.lastHit = t; } else if (t - m.lastHit > 150) f.moveHit = false;
      } else { f.vx *= 0.6; f.spinAngle = 0; }
    },
    end(f) { f.spinAngle = 0; },
  },
  // Super : 5 passages éclair à travers l'adversaire, griffures dorées
  pantherDance: {
    dur: 1500, pose: (f, t) => (Math.floor(t / 110) % 2 ? 'kick1' : 'punch1'),
    start(f) {
      const s = f.scene; const o = f.opponent;
      const dir0 = f.facing;
      f.passThrough = true;
      for (let i = 0; i < 5; i++) {
        s.time.delayedCall(i * 230, () => {
          if (!o.alive) return;
          const side = i % 2 === 0 ? 1 : -1;
          const tx = Phaser.Math.Clamp(o.x + side * dir0 * 170, s.leftBound + 60, s.rightBound - 60);
          f.facing = tx > f.x ? 1 : -1;
          s.tweens.add({ targets: f, x: tx, duration: 140, ease: 'Quad.easeIn', onUpdate: () => s.fx.ghost(f, 0xffc040) });
          s.time.delayedCall(80, () => {
            s.fx.claw(o.x, chestY(o) + Phaser.Math.Between(-40, 40), 0xffc040);
            const last = i === 4;
            s.applyHit(f, o, { dmg: last ? 90 : 40, hitstun: 450, knock: last ? 500 : 10, unblockable: true, color: 0xffc040, heavy: last, launch: last, keepStanding: !last });
          });
        });
      }
      s.time.delayedCall(1250, () => { f.passThrough = false; f.facing = o.x >= f.x ? 1 : -1; });
    },
    end(f) { f.passThrough = false; },
  },

  // ============================ KANGA ============================
  // Fendoir : la hache fend le sol, une fissure court vers l'adversaire (se pare accroupi)
  axeCleave: {
    dur: 760, cool: 1500, ai: 'far',
    pose: (f, t) => (t < 340 ? 'heavy0' : 'heavy1'),
    update(f, t, m) {
      if (t < 340 || m.fired) return;
      m.fired = true;
      const s = f.scene;
      s.cameras.main.shake(160, 0.01); Sfx.heavyHit();
      s.fx.dust(f.x + f.facing * 150, s.groundY, 1.2); s.fx.rocks(f.x + f.facing * 150, s.groundY, 0xb59a7a, 8);
      f.meleeHit(190, { dmg: 85, hitstun: 520, blockstun: 300, knock: 420, heavy: true, launch: true });
      s.spawnProjectile(f, {
        color: 0xff5a3c, speed: 700, dmg: 45, life: 1.0, w: 90, h: 70, band: 'low', y: s.groundY - 25, groundCrack: true,
        draw: (scn, g) => { g.add(scn.add.ellipse(0, 18, 120, 24, 0xff5a3c, 0.6).setBlendMode(Phaser.BlendModes.ADD)); },
      });
    },
  },
  // Saisie du Buffle : il attrape l'adversaire et le projette derrière lui
  buffaloThrow: {
    dur: 620, cool: 1600, ai: 'close',
    pose: (f, t) => (t < 140 ? 'punch0' : t < 320 ? 'heavy0' : 'heavy1'),
    update(f, t) {
      if (t > 120 && t < 260) f.meleeHit(100, { dmg: 140, hitstun: 600, knock: 520, unblockable: true, heavy: true, launch: true, throwOver: true });
    },
  },
  // Super : bond gigantesque puis séisme (on l'évite en sautant)
  ancestralFury: {
    dur: 1700, pose: (f, t) => (t < 200 ? 'crouch' : f.grounded ? 'heavy1' : 'heavy0'),
    start(f, m) {
      f.scene.time.delayedCall(200, () => { f.vy = -1500; f.vx = f.facing * 120; m.jumped = true; });
    },
    update(f, t, m) {
      if (m.jumped && !m.landed && f.grounded && t > 400) {
        m.landed = true;
        const s = f.scene; const o = f.opponent;
        f.vx = 0;
        s.cameras.main.shake(700, 0.02); Sfx.explosion(); s.fx.flash(0xff3a1e, 0.3, 120);
        s.fx.dust(f.x, s.groundY, 2.5); s.fx.rocks(f.x, s.groundY, 0xb59a7a, 22);
        s.fx.shockRing(f.x, s.groundY, 0xff3a1e);
        if (o.grounded) s.applyHit(f, o, { dmg: 280, hitstun: 600, knock: 300, unblockable: true, heavy: true, launch: true, color: 0xff3a1e });
        else s.fx.floatText(o.x, o.y - 360, 'ESQUIVÉ !', '#ffffff', 30);
      }
    },
  },

  // ============================ UNITÉ K-225 ============================
  // Lame laser : grand arc rouge devant lui
  laserSlash: {
    dur: 520, cool: 1100, ai: 'close',
    pose: (f, t) => (t < 130 ? 'heavy0' : 'heavy1'),
    update(f, t, m) {
      if (t > 130 && !m.fx) { m.fx = true; f.scene.fx.slash(f.x + f.facing * 60, chestY(f), f.facing, 0xff2040, 220); Sfx.zap(); f.vx = f.facing * 260; }
      if (t > 130 && t < 260) f.meleeHit(220, { dmg: 95, hitstun: 420, blockstun: 220, knock: 300 });
      if (t > 260) f.vx *= 0.7;
    },
  },
  // Téléportation derrière l'adversaire + coup de pied
  teleport: {
    dur: 600, cool: 1400, ai: 'far',
    pose: (f, t) => (t < 260 ? 'special' : 'kick1'),
    start(f) {
      const s = f.scene;
      s.fx.glitch(f, 0xff2040);
      f.sprite.setAlpha(0.1); f.invuln = 260;
      s.time.delayedCall(200, () => {
        f.sprite.setAlpha(1);
        if (f.state !== 'special') return;
        const o = f.opponent;
        f.x = Phaser.Math.Clamp(o.x - o.facing * 140, s.leftBound + 60, s.rightBound - 60);
        f.facing = f.x < o.x ? 1 : -1;
        s.fx.glitch(f, 0xff2040); Sfx.zap();
      });
    },
    update(f, t) { if (t > 260 && t < 420) f.meleeHit(130, { dmg: 80, hitstun: 400, blockstun: 200, knock: 340 }); },
    end(f) { f.sprite.setAlpha(1); },
  },
  // Super : verrouillage de cible puis 5 tirs laser
  redProtocol: {
    dur: 1700, pose: (f, t) => (t < 600 ? 'special' : 'punch1'),
    start(f) {
      const s = f.scene; const o = f.opponent;
      s.fx.reticle(o, 0xff1030, 600);
      for (let i = 0; i < 5; i++) {
        s.time.delayedCall(650 + i * 140, () => {
          if (!o.alive) return;
          s.fx.laserLine(f.x + f.facing * 80, chestY(f) - 20, o.x, chestY(o) + Phaser.Math.Between(-50, 50), 0xff1030);
          Sfx.zap();
          const last = i === 4;
          s.applyHit(f, o, { dmg: last ? 100 : 40, hitstun: 450, knock: last ? 520 : 20, unblockable: true, color: 0xff1030, heavy: last, launch: last, keepStanding: !last, projectile: true });
        });
      }
    },
  },

  // ============================ AYA SPARK ============================
  // Orbe plasma lente et énorme, qui explose à l'impact
  plasmaOrb: {
    dur: 560, cool: 1600, ai: 'far',
    pose: (f, t) => (t < 200 ? 'punch0' : 'special'),
    update(f, t, m) {
      if (t < 200 || m.fired) return;
      m.fired = true; Sfx.zap();
      f.scene.spawnProjectile(f, {
        color: 0x4fd2ff, speed: 430, dmg: 95, life: 2.8, w: 110, h: 110, explode: true, heavy: true,
        draw: (scn, g) => {
          const glow = scn.add.circle(0, 0, 62, 0x4fd2ff, 0.25).setBlendMode(Phaser.BlendModes.ADD);
          const ring = scn.add.circle(0, 0, 44, 0x000000, 0).setStrokeStyle(4, 0xbff2ff, 0.9);
          const core = scn.add.circle(0, 0, 30, 0x4fd2ff, 0.9).setBlendMode(Phaser.BlendModes.ADD);
          const white = scn.add.circle(0, 0, 14, 0xffffff, 1);
          g.add([glow, ring, core, white]);
          scn.tweens.add({ targets: ring, scale: { from: 0.7, to: 1.3 }, alpha: { from: 1, to: 0.2 }, repeat: -1, duration: 300 });
        },
        update: (p) => { p.y = p.y0 + Math.sin(p.age * 8) * 14; },
      });
    },
  },
  // Bouclier : renvoie les projectiles à l'envoyeur et réduit les dégâts
  blueShield: {
    dur: 380, cool: 2200, ai: 'def',
    pose: () => 'block',
    start(f) { f.shieldT = 1800; f.reflectT = 1800; f.scene.fx.shield(f); },
  },
  // Super : rayon plasma continu
  overcharge: {
    dur: 1300, pose: () => 'special',
    start(f) { f.scene.time.delayedCall(150, () => f.scene.spawnBeam(f, 0x4fd2ff)); },
  },

  // ============================ KID TREICHVILLE ============================
  // Uppercut enflammé qui envoie en l'air
  treichUppercut: {
    dur: 660, cool: 1300, ai: 'close', invuln: 220,
    pose: (f, t) => (t < 60 ? 'crouch' : 'upper'),
    update(f, t, m) {
      if (t > 60 && t < 140 && f.grounded) { f.vy = -1080; f.vx = f.facing * 200; }
      if (t > 60 && t < 380) {
        if (!m.ring) { m.ring = true; f.scene.fx.fireRing(f.x + f.facing * 50, f.y - 200, 0xffa020); }
        f.scene.fx.ghost(f, 0xffa020);
        f.meleeHit(120, { dmg: 115, hitstun: 520, blockstun: 240, knock: 240, launch: true, heavy: true, color: 0xffa020 }, 'high');
      }
      if (t > 300 && f.grounded) f.vx = 0;
    },
  },
  // Crochet blindé : il avance en encaissant un coup sans broncher, puis frappe
  armoredHook: {
    dur: 720, cool: 1700, ai: 'mid',
    pose: (f, t) => (t < 420 ? (Math.floor(t / 120) % 2 ? 'walk1' : 'walk0') : 'punch1'),
    start(f) { f.armorHits = 1; f.scene.fx.armorGlow(f, 0xff8a3c, 420); },
    update(f, t, m) {
      if (t < 420) f.vx = f.facing * 320;
      else { f.vx *= 0.6; f.armorHits = 0; }
      if (t > 420 && t < 540) {
        if (!m.fx) { m.fx = true; Sfx.whoosh(true); }
        f.meleeHit(140, { dmg: 120, hitstun: 480, blockstun: 280, knock: 520, heavy: true, launch: true, color: 0xff8a3c });
      }
    },
    end(f) { f.armorHits = 0; },
  },
  // Super : rafale de coups puis K.-O. au ralenti
  koExpress: {
    dur: 1500, pose: (f) => f.superPose || 'punch0',
    start(f) {
      const s = f.scene; const o = f.opponent;
      f.superPose = 'punch0';
      const target = Phaser.Math.Clamp(o.x - f.facing * 115, s.leftBound + 60, s.rightBound - 60);
      s.tweens.add({
        targets: f, x: target, duration: 200, ease: 'Quad.easeIn', onUpdate: () => s.fx.ghost(f, 0xffd020),
        onComplete: () => {
          let n = 0;
          s.time.addEvent({
            delay: 95, repeat: 7, callback: () => {
              n++;
              const last = n === 8;
              f.superPose = last ? 'upper' : n % 2 ? 'punch1' : 'punch0';
              f.lungePulse = 1;
              if (last) { s.slowMotion(0.25, 500); s.fx.flash(0xffffff, 0.6, 120); }
              s.applyHit(f, o, { dmg: last ? 110 : 26, hitstun: 450, knock: last ? 620 : 20, unblockable: true, color: 0xffd020, heavy: last, launch: last, keepStanding: !last });
            },
          });
        },
      });
    },
  },

  // ============================ L'ARCHER DU BANCO ============================
  // Flèche perçante : très rapide, traverse et détruit les autres projectiles
  emeraldArrow: {
    dur: 520, cool: 1100, ai: 'far',
    pose: (f, t) => (t < 220 ? 'idle0' : 'special'),
    update(f, t, m) {
      if (t < 220 || m.fired) return;
      m.fired = true; Sfx.arrow();
      f.scene.spawnProjectile(f, {
        color: 0x7dff6a, speed: 1500, dmg: 75, life: 1.6, w: 120, h: 30, pierceProjectiles: true,
        draw: (scn, g, facing) => {
          g.add(scn.add.ellipse(0, 0, 150, 22, 0x7dff6a, 0.35).setBlendMode(Phaser.BlendModes.ADD));
          g.add(scn.add.rectangle(0, 0, 100, 5, 0xc9ffbf));
          g.add(scn.add.triangle(54 * facing, 0, 0, -10, 0, 10, 24 * facing, 0, 0xffffff));
          g.add(scn.add.triangle(-48 * facing, 0, 0, -9, 0, 9, -16 * facing, 0, 0x7dff6a));
        },
      });
    },
  },
  // Pluie de flèches tirées en cloche, qui retombent sur l'adversaire
  arrowRain: {
    dur: 560, cool: 1800, ai: 'far',
    pose: () => 'win',
    start(f) { f.scene.time.delayedCall(220, () => { if (f.alive) f.scene.spawnRain(f, 0x7dff6a, 5, 24, { style: 'arrow' }); }); },
  },
  // Super : des racines immobilisent l'adversaire, puis une flèche géante
  forestSpirit: {
    dur: 1900, pose: (f, t) => (t < 1100 ? 'win' : 'special'),
    start(f) {
      const s = f.scene; const o = f.opponent;
      for (let i = 0; i < 4; i++) {
        s.time.delayedCall(150 + i * 220, () => {
          if (!o.alive) return;
          s.fx.roots(o.x + Phaser.Math.Between(-40, 40), s.groundY, 0x3fae3a);
          s.applyHit(f, o, { dmg: 30, hitstun: 700, knock: 0, unblockable: true, color: 0x7dff6a, keepStanding: true });
        });
      }
      s.time.delayedCall(1150, () => {
        if (!o.alive) return;
        s.fx.laserLine(f.x + f.facing * 80, chestY(f), o.x, chestY(o), 0x7dff6a, 22);
        Sfx.arrow(); Sfx.explosion();
        s.applyHit(f, o, { dmg: 150, hitstun: 600, knock: 640, unblockable: true, color: 0x7dff6a, heavy: true, launch: true, projectile: true });
      });
    },
  },
};

export function moveDef(id) { return MOVES[id]; }

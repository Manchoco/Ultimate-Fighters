import Phaser from 'phaser';
import { Controls } from '../systems/Controls.js';
import { MAX_HP, MAX_SUPER } from '../systems/Fighter.js';
import { Sfx } from '../systems/Sfx.js';

import { FONT } from './ui.js';

// Interface du combat, dans une scène séparée pour ne pas suivre le zoom de la caméra.
export class HUDScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  init(data) { this.fight = data.fight; }

  create() {
    const W = this.scale.width;
    const f = this.fight;
    this.controls = new Controls(this);

    // Barres de vie
    const barW = 470, barH = 30, top = 34;
    this.bars = {};
    for (const side of ['left', 'right']) {
      const fighter = side === 'left' ? f.p1 : f.p2;
      const x = side === 'left' ? 30 : W - 30 - barW;
      const frame = this.add.rectangle(x - 4, top - 4, barW + 8, barH + 8, 0x000000, 0.75).setOrigin(0).setStrokeStyle(2, 0xffd23a);
      const lag = this.add.rectangle(x, top, barW, barH, 0xffffff, 0.9).setOrigin(side === 'left' ? 1 : 0, 0);
      const hp = this.add.rectangle(x, top, barW, barH, 0xf2c014).setOrigin(side === 'left' ? 1 : 0, 0);
      // la barre se vide vers le centre (comme dans les jeux de combat)
      lag.x = side === 'left' ? x + barW : x; hp.x = lag.x;
      const portrait = this.add.image(side === 'left' ? 8 : W - 8, top + barH + 8, `p_${fighter.data.id}`).setOrigin(side === 'left' ? 0 : 1, 0).setDisplaySize(84, 84);
      const pframe = this.add.rectangle(portrait.x, portrait.y, 84, 84).setOrigin(portrait.originX, 0).setStrokeStyle(3, 0xffd23a);
      const name = this.add.text(side === 'left' ? 100 : W - 100, top + barH + 10, fighter.data.name.toUpperCase(), {
        fontFamily: FONT, fontSize: '26px', color: '#fff', stroke: '#000', strokeThickness: 5,
      }).setOrigin(side === 'left' ? 0 : 1, 0);
      const winDots = [0, 1].map((i) => this.add.circle(side === 'left' ? x + barW - 14 - i * 26 : x + 14 + i * 26, top + barH + 26, 9, 0x333333).setStrokeStyle(2, 0xffd23a));
      // Jauge de super
      const sx = side === 'left' ? 100 : W - 100 - 300;
      this.add.rectangle(sx - 2, 680 - 2, 304, 20, 0x000000, 0.7).setOrigin(0).setStrokeStyle(2, 0x7a5cff);
      const sup = this.add.rectangle(side === 'left' ? sx : sx + 300, 680, 0, 16, 0x8f6bff).setOrigin(side === 'left' ? 0 : 1, 0);
      const supTxt = this.add.text(side === 'left' ? sx : sx + 300, 655, 'SUPER', { fontFamily: FONT, fontSize: '20px', color: '#c9b8ff', stroke: '#000', strokeThickness: 4 }).setOrigin(side === 'left' ? 0 : 1, 0);
      this.bars[side] = { fighter, hp, lag, barW, winDots, sup, supTxt, lagVal: 1, frame, portrait, pframe, name };
    }
    // Score du joueur
    this.scoreTxt = this.add.text(100, top + barH + 42, 'SCORE 0', { fontFamily: FONT, fontSize: '20px', color: '#ffd23a', stroke: '#000', strokeThickness: 4 });
    // Chrono
    this.add.rectangle(W / 2, top + 14, 84, 66, 0x000000, 0.75).setStrokeStyle(2, 0xffd23a);
    this.timer = this.add.text(W / 2, top + 14, '99', { fontFamily: FONT, fontSize: '46px', color: '#ffd23a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    // Nom de l'arène
    this.add.text(W / 2, top + 58, f.stageData.name.toUpperCase(), { fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0).setAlpha(0.85);

    // Bouton pause (tactile et souris)
    const pb = this.add.text(W / 2, 128, '❚❚', { fontFamily: 'Arial', fontSize: '28px', color: '#fff', backgroundColor: '#00000088', padding: { x: 14, y: 6 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    pb.on('pointerdown', () => this.fight.togglePause());

    this.bannerText = this.add.text(W / 2, 300, '', { fontFamily: FONT, fontSize: '96px', color: '#fff', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.comboTxt = { left: null, right: null };

    // Aide clavier (PC) au premier round
    if (!this.controls.touchEnabled) {
      const help = this.add.text(W / 2, 708, 'Déplacement : ← → / Q D · Saut : ↑ / Z · Garde : reculer · J coup de poing · K coup de pied · L spécial 1 · I spécial 2 · O super · Échap pause', {
        fontFamily: FONT, fontSize: '15px', color: '#fff', backgroundColor: '#00000099', padding: { x: 10, y: 4 },
      }).setOrigin(0.5, 1);
      this.time.delayedCall(9000, () => this.tweens.add({ targets: help, alpha: 0, duration: 800 }));
    }
    this.buildPause();
    if (f.training) this.buildTraining();
  }

  // Panneau du mode entraînement : liste des coups, mannequin, super illimitée
  buildTraining() {
    const W = this.scale.width; const f = this.fight; const d = f.p1.data;
    const lines = [
      'LISTE DES COUPS',
      'Poing J / P  ·  Pied K  ·  Balayette ↓ + K',
      'Enchaîner : poing → pied → spécial → super',
      `S1 (L) ${d.s1.name} : ${d.s1.desc}`,
      `S2 (I) ${d.s2.name} : ${d.s2.desc}`,
      `SUPER (O) ${d.sup.name} : ${d.sup.desc}`,
    ];
    this.trainPanel = this.add.text(W / 2, 150, lines.join('\n'), {
      fontFamily: FONT, fontSize: '15px', color: '#fff', backgroundColor: '#000000aa', padding: { x: 12, y: 8 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0);
    const modes = ['MANNEQUIN : IMMOBILE', 'MANNEQUIN : SE PROTÈGE', 'MANNEQUIN : SAUTE', 'MANNEQUIN : SE BAT'];
    const mk = (x, label, cb) => {
      const b = this.add.text(x, 330, label, { fontFamily: FONT, fontSize: '16px', color: '#fff', backgroundColor: '#2a1f5ccc', padding: { x: 10, y: 6 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => { Sfx.select(); cb(b); });
      return b;
    };
    mk(W / 2 - 300, modes[0], (b) => { f.dummyMode = (f.dummyMode + 1) % 4; b.setText(modes[f.dummyMode]); });
    this.superInfinite = true;
    mk(W / 2, 'SUPER ILLIMITÉE : OUI', (b) => { this.superInfinite = !this.superInfinite; b.setText(`SUPER ILLIMITÉE : ${this.superInfinite ? 'OUI' : 'NON'}`); });
    mk(W / 2 + 300, 'MASQUER LA LISTE', (b) => { this.trainPanel.setVisible(!this.trainPanel.visible); b.setText(this.trainPanel.visible ? 'MASQUER LA LISTE' : 'AFFICHER LA LISTE'); });
    this.bestCombo = this.add.text(W / 2, 372, '', { fontFamily: FONT, fontSize: '18px', color: '#ffd23a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
  }

  refresh() {
    const f = this.fight;
    if (!this.timer) return;
    this.timer.setText(String(Math.ceil(Math.max(0, f.timeLeft ?? 99))));
    if (this.scoreTxt) this.scoreTxt.setText(`SCORE ${f.score.toLocaleString('fr-FR')}`);
    for (const side of ['left', 'right']) {
      const b = this.bars[side];
      const r = Phaser.Math.Clamp(b.fighter.hp / MAX_HP, 0, 1);
      b.hp.width = b.barW * r;
      b.hp.setFillStyle(r < 0.25 ? 0xff3b2f : 0xf2c014);
      if (b.lagVal > r) b.lagVal = Math.max(r, b.lagVal - 0.006); else b.lagVal = r;
      b.lag.width = b.barW * b.lagVal;
      const s = b.fighter.superM / MAX_SUPER;
      b.sup.width = 300 * s;
      const full = s >= 1;
      b.sup.setFillStyle(full ? (Math.floor(this.time.now / 120) % 2 ? 0xffe14d : 0xb98cff) : 0x8f6bff);
      b.supTxt.setText(full ? 'SUPER PRÊT !' : 'SUPER');
      b.winDots.forEach((d, i) => d.setFillStyle(b.fighter.wins > i ? 0xffd23a : 0x333333));
    }
  }

  banner(text, color = '#fff', dur = 1000) {
    if (!this.bannerText) return;
    const t = this.bannerText;
    this.tweens.killTweensOf(t);
    t.setFontSize(96).setText(text).setColor(color);
    const maxW = this.scale.width - 80; // la police Ojuju est large : on réduit si besoin
    if (t.width > maxW) t.setFontSize(Math.floor(96 * maxW / t.width));
    t.setAlpha(1).setScale(1.8);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: dur, duration: 250 });
  }

  comboText(side, n, dmg = 0) {
    if (this.bestCombo && side === 'left') {
      this.bestN = Math.max(this.bestN || 0, n);
      this.bestCombo.setText(`Dernier combo : ${n} coups, ${dmg} dégâts  ·  Record : ${this.bestN} coups`);
    }
    const W = this.scale.width;
    const x = side === 'left' ? 24 : W - 24;
    if (this.comboTxt[side]) this.comboTxt[side].destroy();
    const label = n >= 8 ? 'INARRÊTABLE !' : n >= 5 ? 'SUPERBE !' : n >= 3 ? 'BIEN JOUÉ !' : '';
    const t = this.add.text(x, 220, `${n} COUPS\n${label}${label ? ' ' : ''}${dmg} DÉGÂTS`, { fontFamily: FONT, fontSize: '40px', color: '#ffd23a', stroke: '#000', strokeThickness: 7, align: side === 'left' ? 'left' : 'right', lineSpacing: -4 }).setOrigin(side === 'left' ? 0 : 1, 0.5);
    this.comboTxt[side] = t;
    t.setScale(1.4);
    this.tweens.add({ targets: t, scale: 1, duration: 150 });
    this.tweens.add({ targets: t, alpha: 0, delay: 700, duration: 300, onComplete: () => { if (this.comboTxt[side] === t) this.comboTxt[side] = null; t.destroy(); } });
  }

  superSplash(f, side) {
    const W = this.scale.width;
    const c = Phaser.Display.Color.IntegerToColor(f.data.sup.color);
    const band = this.add.rectangle(W / 2, 360, W, 150, 0x000000, 0.75);
    const stripe = this.add.rectangle(side === 'left' ? -W : W * 2, 360, W, 8, f.data.sup.color);
    const img = this.add.image(side === 'left' ? 160 : W - 160, 450, `p_${f.data.id}`).setDisplaySize(190, 190).setOrigin(0.5, 1);
    const txt = this.add.text(W / 2, 360, f.data.sup.name.toUpperCase(), { fontFamily: FONT, fontSize: '64px', color: c.rgba, stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    txt.setAlpha(0).setScale(1.5);
    this.tweens.add({ targets: stripe, x: W / 2, duration: 200 });
    this.tweens.add({ targets: txt, alpha: 1, scale: 1, duration: 200 });
    this.time.delayedCall(850, () => this.tweens.add({ targets: [band, stripe, img, txt], alpha: 0, duration: 200, onComplete: () => { band.destroy(); stripe.destroy(); img.destroy(); txt.destroy(); } }));
  }

  buildPause() {
    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(300).setVisible(false);
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive();
    const title = this.add.text(W / 2, 200, 'PAUSE', { fontFamily: FONT, fontSize: '80px', color: '#ffd23a', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    const mkBtn = (y, label, cb) => {
      const b = this.add.text(W / 2, y, label, { fontFamily: FONT, fontSize: '40px', color: '#fff', backgroundColor: '#2a1f5c', padding: { x: 30, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerdown', () => { Sfx.select(); cb(); });
      return b;
    };
    const resume = mkBtn(340, 'REPRENDRE', () => this.fight.togglePause());
    const sound = mkBtn(430, Sfx.isMuted() ? 'SON : COUPÉ' : 'SON : ACTIVÉ', () => { const m = Sfx.toggleMute(this); sound.setText(m ? 'SON : COUPÉ' : 'SON : ACTIVÉ'); });
    const quit = mkBtn(520, 'QUITTER LE COMBAT', () => this.fight.quitToMenu());
    c.add([bg, title, resume, sound, quit]);
    this.pauseUI = c;
  }

  showPause(v) { if (this.pauseUI) this.pauseUI.setVisible(v); }
}

import Phaser from 'phaser';
import { FIGHTERS } from '../data/fighters.js';
import { STAGES } from '../data/stages.js';
import { Sfx, Music } from '../systems/Sfx.js';
import { FONT, button, fullscreenButton } from './ui.js';
import { Progress, applyCostume } from '../systems/Progress.js';


export class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  init(data) {
    this.mode = data.mode || 'arcade';
    this.level = data.level ?? 1;
    this.step = 'p1'; // p1 → p2 (combat libre) → stage (combat libre)
    this.cursor = 0;
    this.choice = {};
    this.costume = 0;
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x0b0820).setOrigin(0);
    const bg = this.add.image(W / 2, H / 2, 'st_tambour').setAlpha(0.25);
    bg.setScale(H / bg.height);
    Music.play(this, 'menu', 0.3);

    this.header = this.add.text(W / 2, 34, '', { fontFamily: FONT, fontSize: '44px', color: '#ffd23a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);

    // Grille de portraits (4 × 2) en bas à droite
    this.cells = FIGHTERS.map((f, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 700 + col * 132, y = 470 + row * 132;
      const frame = this.add.rectangle(x, y, 122, 122, 0x000000, 0.6).setStrokeStyle(3, 0x555577);
      const img = this.add.image(x, y, `p_${f.id}`).setDisplaySize(116, 116).setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => {
        Sfx.unlock();
        if (this.step === 'stage') return;
        if (this.cursor === i) this.confirm(); else { this.cursor = i; Sfx.move(); this.refresh(); }
      });
      return { frame, img };
    });

    // Fiche du combattant (à gauche)
    this.big = this.add.image(250, 690, `f_${FIGHTERS[0].id}`).setOrigin(0.5, 1);
    this.nameTxt = this.add.text(700, 110, '', { fontFamily: FONT, fontSize: '54px', color: '#fff', stroke: '#000', strokeThickness: 7 });
    this.titleTxt = this.add.text(702, 172, '', { fontFamily: FONT, fontSize: '24px', color: '#ffd23a' });
    this.statBars = ['VITESSE', 'PUISSANCE', 'DÉFENSE'].map((lab, i) => {
      const y = 222 + i * 34;
      this.add.text(702, y, lab, { fontFamily: FONT, fontSize: '22px', color: '#ddd' });
      return [0, 1, 2, 3, 4].map((k) => this.add.rectangle(850 + k * 46, y + 13, 40, 18, 0x333344).setStrokeStyle(1, 0x000000));
    });
    this.movesTxt = this.add.text(702, 330, '', { fontFamily: FONT, fontSize: '17px', color: '#fff', lineSpacing: 8, wordWrap: { width: 560 } });
    this.vsImg = null;

    this.okBtn = button(this, 1170, 690, 'VALIDER', () => this.confirm(), { size: 30, bg: '#b8860bcc' });
    // Tenues débloquées (bouton visible seulement s'il y a un choix)
    this.costumeBtn = button(this, 250, 690, '', () => this.nextCostume(), { size: 22, bg: '#00000099' });
    this.input.keyboard?.on('keydown-C', () => this.nextCostume());
    button(this, 90, 40, '← RETOUR', () => this.back(), { size: 22, bg: '#00000099' });
    fullscreenButton(this);

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-LEFT', () => this.nav(-1, 0)); kb.on('keydown-RIGHT', () => this.nav(1, 0));
      kb.on('keydown-UP', () => this.nav(0, -1)); kb.on('keydown-DOWN', () => this.nav(0, 1));
      kb.on('keydown-Q', () => this.nav(-1, 0)); kb.on('keydown-D', () => this.nav(1, 0));
      kb.on('keydown-ENTER', () => this.confirm()); kb.on('keydown-J', () => this.confirm());
      kb.on('keydown-ESC', () => this.back());
    }
    this.refresh();
  }

  nav(dx, dy) {
    if (this.step === 'stage') {
      this.stageCursor = Phaser.Math.Wrap(this.stageCursor + dx + dy * 4, 0, STAGES.length);
      Sfx.move(); this.refreshStages(); return;
    }
    const col = this.cursor % 4, row = Math.floor(this.cursor / 4);
    this.cursor = Phaser.Math.Wrap(col + dx, 0, 4) + Phaser.Math.Wrap(row + dy, 0, 2) * 4;
    Sfx.move(); this.refresh();
  }

  refresh() {
    const f = FIGHTERS[this.cursor];
    this.header.setText(this.step === 'p1' ? 'CHOISIS TON COMBATTANT' : this.mode === 'training' ? 'CHOISIS TON PARTENAIRE D\'ENTRAÎNEMENT' : 'CHOISIS TON ADVERSAIRE');
    this.cells.forEach((c, i) => {
      const sel = i === this.cursor;
      const taken = this.choice.p1 === FIGHTERS[i].id && this.step === 'p2';
      c.frame.setStrokeStyle(sel ? 6 : 3, sel ? (this.step === 'p1' ? 0xffd23a : 0xff3b3b) : taken ? 0x2f7bff : 0x555577);
      c.img.setAlpha(sel ? 1 : 0.7);
    });
    this.big.setTexture(`f_${f.id}`).setScale(560 / this.big.height).setFlipX(this.step === 'p2');
    this.big.x = this.step === 'p2' ? 360 : 250;
    this.tweens.killTweensOf(this.big);
    this.big.setAlpha(0); this.tweens.add({ targets: this.big, alpha: 1, duration: 150 });
    const list = this.step === 'p1' ? Progress.costumes(f.id) : [0];
    if (!list.includes(this.costume)) this.costume = 0;
    this.costumeBtn.setVisible(list.length > 1).setText(`TENUE : ${['NORMALE', 'ALTERNATIVE', 'DORÉE'][this.costume]}  (C)`);
    if (this.big.preFX) this.big.preFX.clear();
    applyCostume(this.big, this.costume);
    this.nameTxt.setFontSize(54).setText(f.name.toUpperCase());
    if (this.nameTxt.width > 560) this.nameTxt.setFontSize(Math.floor(54 * 560 / this.nameTxt.width));
    this.titleTxt.setText(f.title);
    const st = [f.stats.speed, f.stats.power, f.stats.defense];
    this.statBars.forEach((bars, i) => bars.forEach((b, k) => b.setFillStyle(k < st[i] ? f.color : 0x333344)));
    this.movesTxt.setText([
      `S1  ${f.s1.name} — ${f.s1.desc}`,
      `S2  ${f.s2.name} — ${f.s2.desc}`,
      `SUPER  ${f.sup.name} — ${f.sup.desc}`,
    ].join('\n'));
  }

  nextCostume() {
    if (this.step !== 'p1') return;
    const list = Progress.costumes(FIGHTERS[this.cursor].id);
    if (list.length < 2) return;
    this.costume = list[(list.indexOf(this.costume) + 1) % list.length];
    Sfx.move(); this.refresh();
  }

  confirm() {
    Sfx.unlock();
    if (this.step === 'stage') return this.startFight(STAGES[this.stageCursor].id);
    const f = FIGHTERS[this.cursor];
    Sfx.confirm();
    if (this.step === 'p1') {
      this.choice.p1 = f.id;
      this.choice.costume = this.costume;
      Sfx.announce(f.name);
      if (this.mode === 'arcade') {
        const ladder = Phaser.Utils.Array.Shuffle(FIGHTERS.filter((x) => x.id !== f.id).map((x) => x.id));
        const stages = Phaser.Utils.Array.Shuffle(STAGES.map((s) => s.id));
        Music.stop(this);
        this.scene.start('Versus', { p1: f.id, p2: ladder[0], stage: stages[0], mode: 'arcade', level: this.level, ladder, stages, ladderIndex: 0, costume: this.costume, score: 0 });
        return;
      }
      this.step = 'p2';
      this.cursor = (this.cursor + 1) % FIGHTERS.length;
      this.refresh();
      return;
    }
    if (this.step === 'p2') {
      this.choice.p2 = f.id;
      this.openStages();
    }
  }

  openStages() {
    this.step = 'stage';
    this.stageCursor = 0;
    const W = this.scale.width, H = this.scale.height;
    this.stageUI = this.add.container(0, 0).setDepth(50);
    const bg = this.add.rectangle(0, 0, W, H, 0x0b0820, 0.95).setOrigin(0).setInteractive();
    const t = this.add.text(W / 2, 40, 'CHOISIS L\'ARÈNE', { fontFamily: FONT, fontSize: '44px', color: '#ffd23a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.stageUI.add([bg, t]);
    this.stageCells = STAGES.map((s, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const x = 170 + col * 313, y = 200 + row * 250;
      // vignette = partie centrale du panorama
      const img = this.add.image(x, y, `st_${s.id}`).setScale(0.26);
      const cw = 1030; const cx = Math.round((img.width - cw) / 2);
      img.setCrop(cx, 0, cw, 720);
      const frame = this.add.rectangle(x, y, cw * 0.26 + 8, 720 * 0.26 + 8).setStrokeStyle(4, 0x555577).setInteractive({ useHandCursor: true });
      const name = this.add.text(x, y + 104, s.name.toUpperCase(), { fontFamily: FONT, fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4, align: 'center', wordWrap: { width: 280 } }).setOrigin(0.5, 0);
      frame.on('pointerdown', () => { if (this.stageCursor === i) this.confirm(); else { this.stageCursor = i; Sfx.move(); this.refreshStages(); } });
      this.stageUI.add([img, frame, name]);
      return { img, frame };
    });
    const rnd = button(this, W / 2 - 160, H - 50, 'AU HASARD', () => this.startFight(Phaser.Utils.Array.GetRandom(STAGES).id), { size: 26, bg: '#00000099' });
    const ok = button(this, W / 2 + 160, H - 50, 'COMBATTRE !', () => this.confirm(), { size: 30, bg: '#b8860bcc' });
    this.stageUI.add([rnd, ok]);
    this.refreshStages();
  }

  refreshStages() {
    this.stageCells.forEach((c, i) => c.frame.setStrokeStyle(i === this.stageCursor ? 6 : 3, i === this.stageCursor ? 0xffd23a : 0x555577));
  }

  startFight(stage) {
    Music.stop(this);
    this.scene.start('Versus', { p1: this.choice.p1, p2: this.choice.p2, stage, mode: this.mode, level: this.level, costume: this.choice.costume || 0, score: 0 });
  }

  back() {
    if (this.step === 'stage') { this.stageUI.destroy(); this.step = 'p2'; this.refresh(); return; }
    if (this.step === 'p2') { this.step = 'p1'; this.refresh(); return; }
    this.scene.start('Title');
  }
}

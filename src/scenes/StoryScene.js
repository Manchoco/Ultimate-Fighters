import Phaser from 'phaser';
import { fighterById } from '../data/fighters.js';
import { PROLOGUE, STORY } from '../data/story.js';
import { Sfx, Music } from '../systems/Sfx.js';
import { FONT, FONT_TITLE, button } from './ui.js';
import { applyCostume } from '../systems/Progress.js';
import { Assets } from '../systems/Assets.js';

// Cartes de récit du mode Histoire (introduction avant le 1er combat, fin après le boss).
// Le texte s'écrit lettre par lettre ; toucher / cliquer / une touche : finir la phrase, puis passer.
export class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }

  init(data) { this.cfg = data; this.idx = 0; this.leaving = false; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const c = this.cfg; const me = fighterById(c.p1);
    const ending = c.part === 'ending';
    const story = STORY[me.id] || { intro: [], ending: [] };
    this.cards = ending ? story.ending : [...PROLOGUE, ...story.intro];
    const nProlog = ending ? 0 : PROLOGUE.length;

    const bg = this.add.image(W / 2, H / 2, Assets.stageKey(ending ? 'foret' : 'tambour'));
    bg.setScale(Math.max(W / bg.width, H / bg.height)).setAlpha(0.5);
    this.tweens.add({ targets: bg, scale: bg.scale * 1.08, duration: 20000 });
    this.add.rectangle(0, 0, W, H, 0x07040f, 0.45).setOrigin(0);

    // Le masque pendant le prologue, le héros ensuite (et le masque vaincu, grisé, à la fin)
    this.boss = this.add.image(W - 260, H, 'f_koro').setOrigin(0.5, 1).setFlipX(true).setAlpha(0);
    this.boss.setScale(600 / this.boss.height);
    if (ending) this.boss.setTint(0x555555);
    this.hero = this.add.image(280, H, `f_${me.id}`).setOrigin(0.5, 1).setAlpha(0);
    this.hero.setScale(600 / this.hero.height); applyCostume(this.hero, c.costume);
    this.showFor = (i) => {
      const prolog = i < nProlog;
      this.tweens.add({ targets: this.boss, alpha: ending ? 0.35 : prolog ? 1 : 0.25, duration: 500 });
      this.tweens.add({ targets: this.hero, alpha: prolog ? 0 : 1, duration: 500 });
    };

    this.add.text(W / 2, 44, ending ? 'ÉPILOGUE' : 'MODE HISTOIRE', { fontFamily: FONT_TITLE, fontSize: '46px', color: '#ffd23a', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    this.add.rectangle(W / 2, H - 120, W - 120, 170, 0x000000, 0.72).setStrokeStyle(3, 0xffd23a, 0.8);
    this.txt = this.add.text(W / 2, H - 120, '', { fontFamily: FONT, fontSize: '30px', color: '#fff', align: 'center', lineSpacing: 8, wordWrap: { width: W - 200 } }).setOrigin(0.5);
    this.hint = this.add.text(W - 80, H - 44, '▶', { fontFamily: FONT, fontSize: '26px', color: '#ffd23a' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.hint, x: W - 72, yoyo: true, repeat: -1, duration: 400 });
    button(this, W - 110, 44, 'PASSER ▶▶', () => this.finish(), { size: 22, bg: '#00000099' });

    Music.play(this, ending ? 'victory' : 'menu', 0.35, !ending);
    this.show(0);
    this.input.on('pointerdown', (p, over) => { if (!over.length) this.advance(); });
    this.input.keyboard?.on('keydown', (e) => { if (e.key === 'Escape') this.finish(); else this.advance(); });
  }

  show(i) {
    this.idx = i; this.showFor(i);
    const full = this.cards[i];
    this.typing = true; this.hint.setAlpha(0);
    let n = 0;
    this.typer?.remove();
    this.typer = this.time.addEvent({
      delay: 24, repeat: full.length - 1,
      callback: () => {
        n++; this.txt.setText(full.slice(0, n));
        if (n % 3 === 0) Sfx.blip(520 + (n % 7) * 30, 480, 0.03, 0.04);
        if (n >= full.length) this.doneTyping();
      },
    });
  }

  doneTyping() { this.typing = false; this.typer?.remove(); this.txt.setText(this.cards[this.idx]); this.hint.setAlpha(1); }

  advance() {
    if (this.leaving) return;
    if (this.typing) { this.doneTyping(); return; }
    Sfx.select();
    if (this.idx + 1 < this.cards.length) this.show(this.idx + 1); else this.finish();
  }

  finish() {
    if (this.leaving) return;
    this.leaving = true; this.typer?.remove();
    const { part, ...cfg } = this.cfg;
    if (part === 'ending') { this.theEnd(); return; }
    Music.stop(this);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Versus', cfg));
  }

  theEnd() {
    const W = this.scale.width, H = this.scale.height;
    const me = fighterById(this.cfg.p1);
    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(50);
    this.tweens.add({ targets: veil, fillAlpha: 0.85, duration: 500 });
    const t = this.add.text(W / 2, H / 2 - 90, 'FIN', { fontFamily: FONT_TITLE, fontSize: '140px', color: '#ffd23a', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5).setDepth(51).setAlpha(0);
    const sub = this.add.text(W / 2, H / 2 + 20, `L'histoire de ${me.name}`, { fontFamily: FONT, fontSize: '32px', color: '#fff' }).setOrigin(0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: [t, sub], alpha: 1, duration: 700, delay: 300 });
    Sfx.announce(`Fin de l'histoire de ${me.name}`, ['finhistoire', me.id]);
    this.time.delayedCall(900, () => {
      button(this, W / 2, H / 2 + 120, 'MENU', () => { Music.stop(this); this.scene.start('Title'); }).setDepth(52);
      button(this, W / 2, H / 2 + 195, 'AUTRE HISTOIRE', () => { Music.stop(this); this.scene.start('Select', { mode: 'story', level: this.cfg.level }); }, { size: 28 }).setDepth(52);
    });
  }
}

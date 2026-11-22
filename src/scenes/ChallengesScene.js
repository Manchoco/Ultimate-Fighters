import Phaser from 'phaser';
import { CHALLENGES, Progress, UNLOCKS } from '../systems/Progress.js';
import { FONT, FONT_TITLE, button } from './ui.js';
import { Assets } from '../systems/Assets.js';

// Liste des défis, de leur état et des récompenses
export class ChallengesScene extends Phaser.Scene {
  constructor() { super('Challenges'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const p = Progress.get();
    const n = Object.keys(p.done).length;
    const bg = this.add.image(W / 2, H / 2, Assets.stageKey('foret')); bg.setScale(H / bg.height).setAlpha(0.3);
    this.add.rectangle(0, 0, W, H, 0x0b0820, 0.6).setOrigin(0);
    this.add.text(W / 2, 46, 'DÉFIS', { fontFamily: FONT_TITLE, fontSize: '64px', color: '#ffd23a', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(W / 2, 100, `${n} / ${CHALLENGES.length} réussis  ·  Meilleur score Arcade : ${p.best.toLocaleString('fr-FR')}`, { fontFamily: FONT, fontSize: '22px', color: '#fff' }).setOrigin(0.5);

    CHALLENGES.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 80 + col * 580, y = 136 + row * 64;
      const ok = !!p.done[c.id];
      this.add.rectangle(x, y, 540, 58, ok ? 0x2a5a1f : 0x1c1640, 0.85).setOrigin(0).setStrokeStyle(2, ok ? 0x7dff6a : 0x555577);
      this.add.text(x + 16, y + 29, ok ? '✔' : '✖', { fontFamily: 'Arial', fontSize: '30px', color: ok ? '#7dff6a' : '#666688' }).setOrigin(0, 0.5);
      this.add.text(x + 58, y + 6, c.name.toUpperCase(), { fontFamily: FONT, fontSize: '22px', color: ok ? '#ffffff' : '#bbbbdd' });
      this.add.text(x + 58, y + 33, c.desc, { fontFamily: FONT, fontSize: '15px', color: '#ddd' });
    });

    const rewards = [
      'Terminer l\'Arcade avec un combattant : sa tenue alternative',
      `${UNLOCKS.ahouAt} défis : Ahou la Nuit${Progress.ahouUnlocked() ? ' (débloquée !)' : ''}`,
      `${UNLOCKS.goldAt} défis : tenue dorée pour tous`,
    ];
    this.add.text(W / 2, 600, 'RÉCOMPENSES  —  ' + rewards.join('   ·   '), { fontFamily: FONT, fontSize: '15px', color: '#ffd23a', align: 'center', wordWrap: { width: 1180 } }).setOrigin(0.5, 0);
    button(this, W / 2, 675, 'RETOUR', () => this.scene.start('Title'), { size: 30 });
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Title'));
  }
}

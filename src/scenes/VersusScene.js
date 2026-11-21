import Phaser from 'phaser';
import { fighterById } from '../data/fighters.js';
import { STAGES } from '../data/stages.js';
import { Sfx } from '../systems/Sfx.js';
import { FONT } from './ui.js';

// Écran « face à face » avant chaque combat.
export class VersusScene extends Phaser.Scene {
  constructor() { super('Versus'); }

  init(data) { this.cfg = data; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const a = fighterById(this.cfg.p1), b = fighterById(this.cfg.p2);
    const st = STAGES.find((s) => s.id === this.cfg.stage);
    const bg = this.add.image(W / 2, H / 2, `st_${st.id}`); bg.setScale(H / bg.height).setAlpha(0.45);
    this.add.rectangle(0, 0, W / 2, H, a.color, 0.35).setOrigin(0);
    this.add.rectangle(W / 2, 0, W / 2, H, b.color, 0.35).setOrigin(0);

    const left = this.add.image(-300, H, `f_${a.id}`).setOrigin(0.5, 1); left.setScale(620 / left.height);
    const right = this.add.image(W + 300, H, `f_${b.id}`).setOrigin(0.5, 1).setFlipX(true); right.setScale(620 / right.height);
    this.tweens.add({ targets: left, x: 300, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: right, x: W - 300, duration: 450, ease: 'Back.easeOut' });

    const vs = this.add.text(W / 2, H / 2 - 40, 'VS', { fontFamily: FONT, fontSize: '170px', color: '#ffd23a', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setScale(3).setAlpha(0);
    this.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 300, delay: 350, ease: 'Back.easeOut', onStart: () => Sfx.heavyHit() });

    const style = { fontFamily: FONT, fontSize: '44px', color: '#fff', stroke: '#000', strokeThickness: 7 };
    this.add.text(40, 40, a.name.toUpperCase(), style);
    this.add.text(W - 40, 40, b.name.toUpperCase(), style).setOrigin(1, 0);
    this.add.text(W / 2, H - 50, `${st.name.toUpperCase()} — ${st.place.toUpperCase()}`, { fontFamily: FONT, fontSize: '28px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    if (this.cfg.mode === 'arcade') {
      this.add.text(W / 2, 110, `COMBAT ${this.cfg.ladderIndex + 1} / ${this.cfg.ladder.length}`, { fontFamily: FONT, fontSize: '30px', color: '#ffd23a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    }
    Sfx.announce(`${a.name} contre ${b.name}`);

    const go = () => { if (this.done) return; this.done = true; this.scene.start('Fight', this.cfg); };
    this.time.delayedCall(2600, go);
    this.input.once('pointerdown', () => this.time.delayedCall(200, go));
    this.input.keyboard?.once('keydown', go);
  }
}

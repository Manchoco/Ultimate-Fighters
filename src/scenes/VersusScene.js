import Phaser from 'phaser';
import { fighterById } from '../data/fighters.js';
import { STAGES } from '../data/stages.js';
import { Sfx } from '../systems/Sfx.js';
import { FONT, FONT_TITLE } from './ui.js';
import { applyCostume } from '../systems/Progress.js';
import { BOSS_TAUNT } from '../data/story.js';
import { Assets } from '../systems/Assets.js';

// Écran « face à face » avant chaque combat.
export class VersusScene extends Phaser.Scene {
  constructor() { super('Versus'); }

  init(data) { this.cfg = data; this.done = false; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const a = fighterById(this.cfg.p1), b = fighterById(this.cfg.p2);
    const st = STAGES.find((s) => s.id === this.cfg.stage);
    const bg = this.add.image(W / 2, H / 2, Assets.stageKey(st.id)); bg.setScale(H / bg.height).setAlpha(0.45);
    this.add.rectangle(0, 0, W / 2, H, a.color, 0.35).setOrigin(0);
    this.add.rectangle(W / 2, 0, W / 2, H, b.color, 0.35).setOrigin(0);

    const left = this.add.image(-300, H, `f_${a.id}`).setOrigin(0.5, 1); left.setScale(620 / left.height);
    applyCostume(left, this.cfg.costume);
    const right = this.add.image(W + 300, H, `f_${b.id}`).setOrigin(0.5, 1).setFlipX(true); right.setScale(620 / right.height);
    this.tweens.add({ targets: left, x: 300, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: right, x: W - 300, duration: 450, ease: 'Back.easeOut' });

    const vs = this.add.text(W / 2, H / 2 - 40, 'VS', { fontFamily: FONT_TITLE, fontSize: '190px', color: '#ffd23a', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setScale(3).setAlpha(0);
    this.tweens.add({ targets: vs, scale: 1, alpha: 1, duration: 300, delay: 350, ease: 'Back.easeOut', onStart: () => Sfx.heavyHit() });

    const style = { fontFamily: FONT, fontSize: '44px', color: '#fff', stroke: '#000', strokeThickness: 7 };
    const fit = (t) => { if (t.width > 540) t.setFontSize(Math.floor(44 * 540 / t.width)); return t; };
    fit(this.add.text(40, 40, a.name.toUpperCase(), style));
    fit(this.add.text(W - 40, 40, b.name.toUpperCase(), style).setOrigin(1, 0));
    this.add.text(W / 2, H - 50, `${st.name.toUpperCase()} — ${st.place.toUpperCase()}`, { fontFamily: FONT, fontSize: '28px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    if (b.boss) {
      this.add.text(W / 2, H / 2 + 90, 'COMBAT FINAL', { fontFamily: FONT_TITLE, fontSize: '44px', color: '#ff4b4b', stroke: '#000', strokeThickness: 9 }).setOrigin(0.5).setDepth(5);
      const q = this.add.text(W / 2, H - 150, `« ${BOSS_TAUNT} »`, { fontFamily: FONT, fontSize: '24px', color: '#ffe9b0', align: 'center', stroke: '#000', strokeThickness: 5, wordWrap: { width: 560 } }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: q, alpha: 1, delay: 700, duration: 400 });
    } else if (this.cfg.mode === 'arcade' || this.cfg.mode === 'story') {
      this.add.text(W / 2, 110, `COMBAT ${this.cfg.ladderIndex + 1} / ${this.cfg.ladder.length}`, { fontFamily: FONT, fontSize: '30px', color: '#ffd23a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    }
    Sfx.announce(`${a.name} contre ${b.name}`, [a.id, 'contre', b.id]);

    // Tout ce qu'il faut pour le combat (souvent déjà téléchargé pendant la sélection)
    let loaded = false, wantGo = false;
    const loading = this.add.text(W / 2, H - 100, '', { fontFamily: FONT, fontSize: '20px', color: '#ffffffaa' }).setOrigin(0.5);
    Assets.ensure(Assets.forFight(this.cfg), () => { loaded = true; if (loading.active) loading.setText(''); if (wantGo) go(); },
      (v) => { if (loading.active && wantGo) loading.setText(`Préparation du combat… ${Math.round(v * 100)} %`); });

    const go = () => {
      if (this.done) return;
      if (!loaded) { wantGo = true; loading.setText('Préparation du combat…'); return; }
      this.done = true; this.scene.start('Fight', this.cfg);
    };
    this.time.delayedCall(b.boss ? 4200 : 2600, go);
    this.input.once('pointerdown', () => this.time.delayedCall(200, go));
    this.input.keyboard?.once('keydown', go);
  }
}

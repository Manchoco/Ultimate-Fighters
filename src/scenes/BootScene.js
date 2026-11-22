import Phaser from 'phaser';
import { ALL_FIGHTERS } from '../data/fighters.js';
import { STAGES } from '../data/stages.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    this.add.text(W / 2, H / 2 - 70, 'ULTIMATE FIGHTERS', { fontFamily: '"Sankofa Display", serif', fontSize: '64px', color: '#ffd23a' }).setOrigin(0.5);
    const box = this.add.rectangle(W / 2, H / 2 + 10, 520, 26, 0x000000).setStrokeStyle(2, 0xffd23a);
    const bar = this.add.rectangle(W / 2 - 256, H / 2 + 10, 0, 18, 0xffd23a).setOrigin(0, 0.5);
    const pct = this.add.text(W / 2, H / 2 + 56, 'Chargement… 0 %', { fontFamily: '"Ojuju", sans-serif', fontSize: '22px', color: '#fff' }).setOrigin(0.5);
    this.load.on('progress', (v) => { bar.width = 512 * v; pct.setText(`Chargement… ${Math.round(v * 100)} %`); });
    this.load.on('loaderror', (f) => console.warn('Fichier manquant :', f.key));
    void box;

    for (const f of ALL_FIGHTERS) {
      this.load.image(`f_${f.id}`, `assets/fighters/${f.id}.png`);
      this.load.image(`p_${f.id}`, `assets/portraits/${f.id}.png`);
    }
    this.load.json('rigs', 'assets/rigs/rigs.json');
    for (const s of STAGES) this.load.image(`st_${s.id}`, `assets/stages/${s.id}.jpg`);
    for (const m of ['menu', 'theme1', 'theme2', 'theme3', 'victory']) this.load.audio(m, [`assets/audio/${m}.ogg`, `assets/audio/${m}.mp3`]);
  }

  create() {
    this.scene.start('Title');
  }
}

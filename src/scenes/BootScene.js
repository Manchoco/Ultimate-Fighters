import Phaser from 'phaser';
import { ALL_FIGHTERS } from '../data/fighters.js';
import { Assets, V } from '../systems/Assets.js';
import { STAGES } from '../data/stages.js';
import { Sfx } from '../systems/Sfx.js';

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

    // Au démarrage : uniquement le menu et l'écran de sélection (≈ 1 Mo).
    // Le reste se télécharge à la demande (voir systems/Assets.js).
    for (const f of ALL_FIGHTERS) {
      this.load.image(`f_${f.id}`, V(`assets/fighters/${f.id}.webp`));
      this.load.image(`p_${f.id}`, V(`assets/portraits/${f.id}.webp`));
    }
    for (const s of STAGES) this.load.image(`stt_${s.id}`, V(`assets/stages/thumb_${s.id}.webp`));
    this.load.image('st_lune', V('assets/stages/lune.webp')); // décor de l'écran titre
    this.load.json('rigs', V('assets/rigs/rigs.json'));
    this.load.json('voices', V('assets/voice/voices.json'));
    this.load.audio('menu', [V('assets/audio/menu.ogg'), V('assets/audio/menu.mp3')]);
  }

  create() {
    // Enregistrements de l'annonceur déclarés dans voices.json (liste vide = voix de synthèse)
    Sfx.voiceGame = this.game;
    this.scene.launch('Loader'); // chargeur permanent (arrière-plan)
    this.scene.start('Title');
    // ensuite, sans bloquer : les enregistrements de l'annonceur
    this.time.delayedCall(0, () => {
      const files = this.cache.json.get('voices')?.files || [];
      Assets.prefetch([
        ...files.map((f) => ({ type: 'audio', key: `v_${f.replace(/\.[a-z0-9]+$/i, '')}`, url: V(`assets/voice/${f}`) })), // ex. « ko.mp3 » → clé v_ko
      ]);
    });
  }
}

import Phaser from 'phaser';
import { FIGHTERS } from '../data/fighters.js';
import { Sfx, Music } from '../systems/Sfx.js';
import { FONT, FONT_TITLE, button, fullscreenButton, muteButton } from './ui.js';

export const LEVEL_NAMES = ['FACILE', 'NORMAL', 'DIFFICILE'];

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    let level = 1;
    try { const v = localStorage.getItem('uf_level'); if (v !== null) level = Phaser.Math.Clamp(Number(v) || 0, 0, 2); } catch (e) { /* ignore */ }
    this.registry.set('level', level);

    const bg = this.add.image(W / 2, H / 2, 'st_lune');
    bg.setScale(H / bg.height);
    this.tweens.add({ targets: bg, x: W / 2 - 300, duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.rectangle(0, 0, W, H, 0x0b0820, 0.55).setOrigin(0);

    // Défilé des combattants
    const n = FIGHTERS.length;
    FIGHTERS.forEach((f, i) => {
      const x = 90 + i * ((W - 180) / (n - 1));
      const img = this.add.image(x, H + 300, `f_${f.id}`).setOrigin(0.5, 1);
      img.setScale(300 / img.height);
      if (i >= n / 2) img.setFlipX(true);
      this.tweens.add({ targets: img, y: H - 4, duration: 500, delay: 80 * i, ease: 'Back.easeOut' });
    });

    const title = this.add.text(W / 2, 128, 'ULTIMATE\nFIGHTERS', {
      fontFamily: FONT_TITLE, fontSize: '112px', color: '#ffd23a', align: 'center', stroke: '#2a0a00', strokeThickness: 16, lineSpacing: -6,
    }).setOrigin(0.5, 0.5);
    title.setShadow(0, 8, '#000', 12, true, true);
    this.tweens.add({ targets: title, scale: 1.03, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });
    this.add.text(W / 2, 262, 'LES LÉGENDES DE CÔTE D\'IVOIRE', { fontFamily: FONT, fontSize: '28px', color: '#ffffff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);

    const go = (mode) => { Sfx.unlock(); this.scene.start('Select', { mode, level: this.registry.get('level') }); };
    button(this, W / 2 - 170, 330, 'HISTOIRE', () => go('story'), { size: 32 });
    button(this, W / 2 + 170, 330, 'ARCADE', () => go('arcade'), { size: 32 });
    button(this, W / 2 - 255, 395, 'COMBAT LIBRE', () => go('free'), { size: 26 });
    button(this, W / 2, 395, 'ENTRAÎNEMENT', () => go('training'), { size: 26 });
    button(this, W / 2 + 255, 395, 'DÉFIS', () => this.scene.start('Challenges'), { size: 26 });
    const lvl = button(this, W / 2, 460, `DIFFICULTÉ : ${LEVEL_NAMES[level]}`, () => {
      level = (level + 1) % 3;
      this.registry.set('level', level);
      try { localStorage.setItem('uf_level', String(level)); } catch (e) { /* ignore */ }
      lvl.setText(`DIFFICULTÉ : ${LEVEL_NAMES[level]}`);
    }, { size: 30 });
    this.add.text(W / 2, 489, 'L\'ordinateur s\'adapte à ton niveau au fil des combats', { fontFamily: FONT, fontSize: '15px', color: '#ffffffcc', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    button(this, W / 2, 528, 'COMMENT JOUER', () => this.showHelp(), { size: 26, bg: '#00000099' });

    fullscreenButton(this);
    muteButton(this);
    this.add.text(12, H - 8, 'v1.0', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffffaa' }).setOrigin(0, 1);

    // La musique ne peut démarrer qu'après une interaction (règle des navigateurs)
    const startMusic = () => Music.play(this, 'menu', 0.35);
    if (!this.sound.locked) startMusic(); else this.sound.once('unlocked', startMusic);
    this.input.keyboard?.once('keydown-ENTER', () => go('story'));
  }

  showHelp() {
    const W = this.scale.width, H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(100);
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.9).setOrigin(0).setInteractive();
    const txt = this.add.text(W / 2, 64, 'COMMENT JOUER', { fontFamily: FONT, fontSize: '54px', color: '#ffd23a' }).setOrigin(0.5);
    const body = [
      'BUT : vider la barre de vie de l\'adversaire. Il faut gagner 2 rounds.',
      'COMBOS : quand un coup touche, enchaîne poing → pied → spécial → super sans attendre.',
      'ARCADE : bats les 7 autres combattants à la suite pour devenir champion.',
      '',
      'SUR PC (clavier)',
      'Se déplacer : ← → ou Q D   ·   Sauter : ↑ ou Z   ·   S\'accroupir : ↓ ou S',
      'Poing : J   ·   Pied : K   ·   Spécial 1 : L   ·   Spécial 2 : I   ·   Super : O   ·   Pause : Échap',
      'Se protéger : reculer (aller dans le sens opposé à l\'adversaire)',
      '',
      'SUR TÉLÉPHONE (tactile, en mode paysage)',
      'Croix à gauche pour bouger · P poing · K pied · S1 / S2 spéciaux · SUP super',
      '',
      'La jauge SUPER se remplit quand tu frappes et quand tu encaisses.',
      'Quand elle clignote, déclenche la super attaque de ton combattant !',
    ].join('\n');
    const t = this.add.text(W / 2, 120, body, { fontFamily: FONT, fontSize: '21px', color: '#fff', align: 'center', lineSpacing: 7 }).setOrigin(0.5, 0);
    const close = button(this, W / 2, H - 60, 'FERMER', () => c.destroy());
    c.add([bg, txt, t, close]);
  }
}

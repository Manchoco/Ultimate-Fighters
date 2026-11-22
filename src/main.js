import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { VersusScene } from './scenes/VersusScene.js';
import { FightScene } from './scenes/FightScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { ChallengesScene } from './scenes/ChallengesScene.js';
import '@fontsource/sankofa-display/400.css';
import '@fontsource/ojuju/800.css';

// Phaser dessine le texte sur un canvas : les polices doivent être chargées avant.
const fontsReady = Promise.race([
  Promise.all([
    document.fonts.load('64px "Sankofa Display"', 'ULTIMATE'),
    document.fonts.load('800 32px "Ojuju"', 'COMBATTEZ'),
  ]),
  new Promise((r) => setTimeout(r, 3000)), // on ne bloque jamais le jeu plus de 3 s
]);

fontsReady.then(() => {
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#0b0820',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 5 },
  render: { antialias: true, pixelArt: false },
  fps: { target: 60 },
  scene: [BootScene, TitleScene, SelectScene, VersusScene, FightScene, HUDScene, ResultScene, ChallengesScene],
});

window.__UF__ = game; // utile pour les tests automatisés
});

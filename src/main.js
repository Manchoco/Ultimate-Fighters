import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { VersusScene } from './scenes/VersusScene.js';
import { FightScene } from './scenes/FightScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { ResultScene } from './scenes/ResultScene.js';

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
  scene: [BootScene, TitleScene, SelectScene, VersusScene, FightScene, HUDScene, ResultScene],
});

window.__UF__ = game; // utile pour les tests automatisés

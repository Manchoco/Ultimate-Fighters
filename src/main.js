import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { VersusScene } from './scenes/VersusScene.js';
import { FightScene } from './scenes/FightScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { StoryScene } from './scenes/StoryScene.js';
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
  scene: [BootScene, TitleScene, SelectScene, VersusScene, FightScene, HUDScene, ResultScene, ChallengesScene, StoryScene],
});

window.__UF__ = game; // utile pour les tests automatisés

// Plein écran automatique au premier toucher / clic, puis verrouillage en paysage.
// (Les navigateurs exigent un geste de l'utilisateur ; l'iPhone n'autorise ni l'un ni l'autre :
// le message « tourne ton téléphone » reste alors affiché en portrait.)
const portrait = () => window.matchMedia('(orientation: portrait)').matches;
const lockLandscape = () => { try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch (e) { /* non pris en charge */ } };
game.scale.on('enterfullscreen', lockLandscape);
let autoDone = false;
document.addEventListener('pointerup', () => {
  if (game.scale.isFullscreen || !game.scale.fullscreen.available) return;
  if (autoDone && !portrait()) return; // une seule fois, sauf si on est encore en portrait
  autoDone = true;
  try { game.scale.startFullscreen({ navigationUI: 'hide' }); } catch (e) { /* refusé par le navigateur */ }
});
});

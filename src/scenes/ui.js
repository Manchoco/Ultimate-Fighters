import { Sfx } from '../systems/Sfx.js';

export const FONT = 'Impact, "Arial Black", sans-serif';

// Bouton texte réutilisable (souris, tactile, clavier via focus externe)
export function button(scene, x, y, label, cb, opts = {}) {
  const t = scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: `${opts.size || 38}px`, color: '#ffffff',
    backgroundColor: opts.bg || '#2a1f5ccc', padding: { x: 28, y: 10 }, stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  t.on('pointerover', () => { t.setColor('#ffd23a'); });
  t.on('pointerout', () => { t.setColor('#ffffff'); });
  t.on('pointerdown', () => { Sfx.unlock(); Sfx.select(); cb(); });
  return t;
}

export function fullscreenButton(scene) {
  const W = scene.scale.width;
  const b = scene.add.text(W - 16, 16, '⛶', { fontFamily: 'Arial', fontSize: '30px', color: '#fff', backgroundColor: '#00000088', padding: { x: 10, y: 2 } })
    .setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(500);
  b.on('pointerup', () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else {
      scene.scale.startFullscreen();
      try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* non supporté */ }
    }
  });
  return b;
}

export function muteButton(scene) {
  const W = scene.scale.width;
  const b = scene.add.text(W - 76, 16, Sfx.isMuted() ? '🔇' : '🔊', { fontFamily: 'Arial', fontSize: '30px', backgroundColor: '#00000088', padding: { x: 8, y: 2 } })
    .setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(500);
  b.on('pointerdown', () => { const m = Sfx.toggleMute(scene); b.setText(m ? '🔇' : '🔊'); });
  return b;
}

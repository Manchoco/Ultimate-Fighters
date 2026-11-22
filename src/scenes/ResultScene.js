import Phaser from 'phaser';
import { fighterById } from '../data/fighters.js';
import { Sfx, Music } from '../systems/Sfx.js';
import { FONT, button } from './ui.js';
import { Progress } from '../systems/Progress.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) { this.cfg = data; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const c = this.cfg;
    const me = fighterById(c.p1), them = fighterById(c.p2);
    const won = c.playerWon;
    const ladderMode = c.mode === 'arcade' || c.mode === 'story';
    const champion = won && ladderMode && c.ladderIndex >= c.ladder.length - 1;
    const winner = won ? me : them;

    const bg = this.add.image(W / 2, H / 2, `st_${c.stage}`); bg.setScale(H / bg.height).setAlpha(0.35);
    this.add.rectangle(0, 0, W, H, won ? 0x1a1200 : 0x14000a, 0.6).setOrigin(0);
    const img = this.add.image(330, H, `f_${winner.id}`).setOrigin(0.5, 1); img.setScale(640 / img.height);
    this.tweens.add({ targets: img, y: H - 10, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });

    if (won) Music.play(this, 'victory', 0.45, false);
    const head = champion ? 'CHAMPION !' : won ? 'VICTOIRE !' : 'DÉFAITE…';
    this.add.text(860, 110, head, { fontFamily: FONT, fontSize: champion ? '96px' : '110px', color: won ? '#ffd23a' : '#ff4b4b', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5);
    Sfx.announce(champion ? `${me.name}, champion d'Ultimate Fighters !` : won ? 'Victoire !' : 'Défaite', champion ? [me.id, 'champion'] : [won ? 'victoire' : 'defaite']);

    const line = champion
      ? (c.mode === 'story' ? `${me.name} a vaincu Kôrô, le Masque Souverain !` : `${me.name} a battu les ${c.ladder.length} combattants.\nTu es le champion d'Ultimate Fighters !`)
      : won ? `${me.name} a battu ${them.name}.` : `${them.name} a battu ${me.name}.`;
    this.add.text(860, 210, line, { fontFamily: FONT, fontSize: '28px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);

    // Score, défis réussis et déblocages
    const res = Progress.recordMatch(c, won, c.stats, c.score || 0);
    this.add.text(860, 290, `SCORE : ${(c.score || 0).toLocaleString('fr-FR')}${c.mode === 'arcade' ? `   ·   RECORD : ${res.best.toLocaleString('fr-FR')}` : ''}`, { fontFamily: FONT, fontSize: '26px', color: '#ffd23a', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    const msgs = [...res.news.map((n) => `DÉFI RÉUSSI : ${n.name} — ${n.desc}`), ...res.unlocks.map((u) => `DÉBLOQUÉ : ${u}`)];
    msgs.slice(0, 4).forEach((m, i) => {
      const t = this.add.text(860, 330 + i * 30, m, { fontFamily: FONT, fontSize: '18px', color: m.startsWith('DÉBLOQUÉ') ? '#7dff6a' : '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, delay: 400 + i * 350, duration: 300, onStart: () => Sfx.confirm() });
    });
    const by = msgs.length ? 330 + Math.min(4, msgs.length) * 30 + 40 : 380;
    const toMenu = () => { Music.stop(this); this.scene.start('Title'); };
    if (ladderMode) {
      if (champion && c.mode === 'story') {
        button(this, 860, by + 20, 'VOIR LA FIN', () => { Music.stop(this); this.scene.start('Story', { ...c, part: 'ending' }); });
      } else if (champion) {
        button(this, 860, by + 20, 'REJOUER', () => { Music.stop(this); this.scene.start('Select', { mode: 'arcade', level: c.level }); });
        button(this, 860, by + 95, 'MENU', toMenu);
      } else if (won) {
        const next = c.ladderIndex + 1;
        button(this, 860, by + 20, `COMBAT SUIVANT (${next + 1}/${c.ladder.length})`, () => {
          Music.stop(this);
          this.scene.start('Versus', { ...c, p2: c.ladder[next], stage: c.stages[next % c.stages.length], ladderIndex: next });
        });
        button(this, 860, by + 95, 'MENU', toMenu);
      } else {
        button(this, 860, by + 20, 'RÉESSAYER', () => { Music.stop(this); this.scene.start('Versus', c); });
        button(this, 860, by + 95, 'MENU', toMenu);
      }
    } else {
      button(this, 860, by + 10, 'REVANCHE', () => { Music.stop(this); this.scene.start('Versus', c); });
      button(this, 860, by + 80, 'CHANGER DE COMBATTANTS', () => { Music.stop(this); this.scene.start('Select', { mode: 'free', level: c.level }); }, { size: 30 });
      button(this, 860, by + 150, 'MENU', toMenu);
    }
  }
}

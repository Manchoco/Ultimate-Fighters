import Phaser from 'phaser';
import { fighterById } from '../data/fighters.js';
import { Sfx, Music } from '../systems/Sfx.js';
import { FONT, button } from './ui.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) { this.cfg = data; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const c = this.cfg;
    const me = fighterById(c.p1), them = fighterById(c.p2);
    const won = c.playerWon;
    const champion = won && c.mode === 'arcade' && c.ladderIndex >= c.ladder.length - 1;
    const winner = won ? me : them;

    const bg = this.add.image(W / 2, H / 2, `st_${c.stage}`); bg.setScale(H / bg.height).setAlpha(0.35);
    this.add.rectangle(0, 0, W, H, won ? 0x1a1200 : 0x14000a, 0.6).setOrigin(0);
    const img = this.add.image(330, H, `f_${winner.id}`).setOrigin(0.5, 1); img.setScale(640 / img.height);
    this.tweens.add({ targets: img, y: H - 10, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });

    if (won) Music.play(this, 'victory', 0.45, false);
    const head = champion ? 'CHAMPION !' : won ? 'VICTOIRE !' : 'DÉFAITE…';
    this.add.text(860, 110, head, { fontFamily: FONT, fontSize: champion ? '96px' : '110px', color: won ? '#ffd23a' : '#ff4b4b', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5);
    Sfx.announce(champion ? `${me.name}, champion d'Ultimate Fighters !` : won ? 'Victoire !' : 'Défaite');

    const line = champion
      ? `${me.name} a battu les 7 combattants.\nTu es le champion d'Ultimate Fighters !`
      : won ? `${me.name} a battu ${them.name}.` : `${them.name} a battu ${me.name}.`;
    this.add.text(860, 210, line, { fontFamily: FONT, fontSize: '28px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);

    const toMenu = () => { Music.stop(this); this.scene.start('Title'); };
    if (c.mode === 'arcade') {
      if (champion) {
        button(this, 860, 420, 'REJOUER', () => { Music.stop(this); this.scene.start('Select', { mode: 'arcade', level: c.level }); });
        button(this, 860, 500, 'MENU', toMenu);
      } else if (won) {
        const next = c.ladderIndex + 1;
        button(this, 860, 400, `COMBAT SUIVANT (${next + 1}/${c.ladder.length})`, () => {
          Music.stop(this);
          this.scene.start('Versus', { ...c, p2: c.ladder[next], stage: c.stages[next % c.stages.length], ladderIndex: next });
        });
        button(this, 860, 480, 'MENU', toMenu);
      } else {
        button(this, 860, 400, 'RÉESSAYER', () => { Music.stop(this); this.scene.start('Versus', c); });
        button(this, 860, 480, 'MENU', toMenu);
      }
    } else {
      button(this, 860, 380, 'REVANCHE', () => { Music.stop(this); this.scene.start('Versus', c); });
      button(this, 860, 460, 'CHANGER DE COMBATTANTS', () => { Music.stop(this); this.scene.start('Select', { mode: 'free', level: c.level }); }, { size: 30 });
      button(this, 860, 540, 'MENU', toMenu);
    }
  }
}

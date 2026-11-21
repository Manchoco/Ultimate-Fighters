import Phaser from 'phaser';

// Effets visuels : étincelles d'impact, images rémanentes, bouclier, textes.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.lastGhost = 0;
  }

  spark(x, y, color = 0xffffff, big = false) {
    const s = this.scene;
    const n = big ? 16 : 9;
    const ring = s.add.circle(x, y, big ? 26 : 16, color, 0).setStrokeStyle(big ? 8 : 5, color, 1).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: ring, scale: big ? 4 : 2.6, alpha: 0, duration: big ? 360 : 240, onComplete: () => ring.destroy() });
    const core = s.add.star(x, y, 8, big ? 12 : 8, big ? 46 : 30, 0xffffff, 1).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: core, scale: 1.6, alpha: 0, angle: 40, duration: 160, onComplete: () => core.destroy() });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const d = (big ? 120 : 70) * (0.5 + Math.random());
      const p = s.add.rectangle(x, y, big ? 14 : 10, 3, color, 1).setDepth(30).setRotation(a).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scaleX: 0.2, duration: 260 + Math.random() * 120, onComplete: () => p.destroy() });
    }
  }

  burst(x, y, color, n = 12) {
    const s = this.scene;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const d = 40 + Math.random() * 80;
      const p = s.add.circle(x, y, 3 + Math.random() * 5, color, 0.9).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 30, alpha: 0, duration: 380 + Math.random() * 200, onComplete: () => p.destroy() });
    }
  }

  ghost(fighter, color) {
    const now = this.scene.time.now;
    if (now - this.lastGhost < 40) return;
    this.lastGhost = now;
    const sp = fighter.sprite;
    const g = this.scene.add.image(sp.x, sp.y, sp.texture.key).setOrigin(0.5, 1).setScale(sp.scaleX, sp.scaleY)
      .setFlipX(sp.flipX).setAngle(sp.angle).setTintFill(color).setAlpha(0.45).setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  shield(fighter) {
    const s = this.scene;
    const c = fighter.data.s2.color;
    const b = s.add.ellipse(fighter.x, fighter.y - 150, 220, 360, c, 0.12).setStrokeStyle(4, c, 0.9).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    const ev = s.time.addEvent({ delay: 16, loop: true, callback: () => b.setPosition(fighter.x, fighter.y - 150) });
    s.tweens.add({ targets: b, alpha: { from: 1, to: 0.5 }, yoyo: true, repeat: 4, duration: 160 });
    s.time.delayedCall(1600, () => { ev.remove(); s.tweens.add({ targets: b, alpha: 0, scale: 1.3, duration: 200, onComplete: () => b.destroy() }); });
  }

  // nuage de poussière au sol (atterrissage, chute, glissade)
  dust(x, y, power = 1) {
    const s = this.scene;
    const n = Math.round(5 + power * 7);
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const p = s.add.circle(x + Phaser.Math.Between(-20, 20), y - 6, Phaser.Math.Between(6, 14) * (0.6 + power * 0.4), 0xd8c7a6, 0.55).setDepth(11);
      s.tweens.add({
        targets: p, x: p.x + dir * Phaser.Math.Between(30, 110) * power, y: y - Phaser.Math.Between(10, 50) * power,
        scale: 1.8, alpha: 0, duration: Phaser.Math.Between(380, 640), ease: 'Quad.easeOut', onComplete: () => p.destroy(),
      });
    }
  }

  floatText(x, y, text, color = '#ffffff', size = 40) {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: '"Ojuju", Impact, sans-serif', fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(60);
    this.scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
    return t;
  }
}

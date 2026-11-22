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

  // ---------- Effets propres aux coups spéciaux ----------
  // Éclair en zigzag entre deux points
  lightning(x1, y1, x2, y2, color, width = 6, dur = 220) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
    const draw = () => {
      g.clear();
      const n = 10; const pts = [[x1, y1]];
      for (let i = 1; i < n; i++) {
        const t = i / n; const j = 40 * (1 - Math.abs(t - 0.5) * 1.4);
        pts.push([x1 + (x2 - x1) * t + Phaser.Math.Between(-j, j) * 0.4, y1 + (y2 - y1) * t + Phaser.Math.Between(-j, j)]);
      }
      pts.push([x2, y2]);
      for (const [w, a, c] of [[width * 3, 0.25, color], [width, 0.9, color], [Math.max(2, width / 3), 1, 0xffffff]]) {
        g.lineStyle(w, c, a); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
        g.strokePath();
      }
    };
    draw();
    const ev = s.time.addEvent({ delay: 45, repeat: Math.floor(dur / 45), callback: draw });
    s.tweens.add({ targets: g, alpha: 0, delay: dur * 0.6, duration: dur * 0.4, onComplete: () => { ev.remove(); g.destroy(); } });
    this.spark(x2, y2, color, false);
  }

  // Éclair blanc plein écran (flash)
  flash(color = 0xffffff, alpha = 0.5, dur = 100) {
    const s = this.scene; const cam = s.cameras.main;
    const r = s.add.rectangle(cam.scrollX - 200, -100, 1800, 1000, color, alpha).setOrigin(0).setDepth(40).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
  }

  // Onde en éventail (Paume d'Or)
  fanWave(x, y, facing, color, range) {
    const s = this.scene;
    for (let i = 0; i < 3; i++) {
      const g = s.add.graphics().setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
      const st = facing > 0 ? -0.6 : Math.PI - 0.6; const en = st + 1.2;
      g.lineStyle(14 - i * 3, color, 0.9); g.beginPath(); g.arc(0, 0, 40, st, en); g.strokePath();
      g.setPosition(x, y);
      s.tweens.add({ targets: g, scale: range / 40, alpha: 0, delay: i * 60, duration: 380, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
    }
    this.burst(x + facing * 60, y, color, 14);
  }

  // Cercle de garde doré (Contre du Sage)
  yinRing(f, color, dur) {
    const s = this.scene;
    const c = s.add.circle(f.x, f.y - 160, 150, color, 0.08).setStrokeStyle(4, color, 0.9).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: c, angle: 360, scale: { from: 1.2, to: 0.9 }, duration: dur, onComplete: () => c.destroy() });
  }

  // Trois griffures (Danse de la Panthère)
  claw(x, y, color) {
    const s = this.scene;
    for (let i = -1; i <= 1; i++) {
      const r = s.add.rectangle(x + i * 22, y, 8, 0, color).setAngle(25).setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: r, height: 170, duration: 90, onComplete: () => s.tweens.add({ targets: r, alpha: 0, duration: 300, onComplete: () => r.destroy() }) });
    }
    this.spark(x, y, color, true);
  }

  // Éclats de roche projetés
  rocks(x, y, color, n = 10) {
    const s = this.scene;
    for (let i = 0; i < n; i++) {
      const r = s.add.rectangle(x + Phaser.Math.Between(-40, 40), y - 10, Phaser.Math.Between(8, 18), Phaser.Math.Between(8, 16), color).setDepth(23).setAngle(Phaser.Math.Between(0, 90));
      const vx = Phaser.Math.Between(-260, 260), vy = -Phaser.Math.Between(300, 750);
      s.tweens.addCounter({
        from: 0, to: 1, duration: 800, onUpdate: (tw) => {
          const t = tw.getValue() * 0.8;
          r.x += vx * 0.016; r.y = y - 10 + vy * t + 1400 * t * t; r.angle += 8;
          if (r.y > y) r.y = y;
        }, onComplete: () => r.destroy(),
      });
    }
  }

  // Onde de choc circulaire au sol
  shockRing(x, y, color) {
    const s = this.scene;
    const e = s.add.ellipse(x, y, 60, 18, color, 0).setStrokeStyle(8, color, 0.9).setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: e, scaleX: 16, scaleY: 6, alpha: 0, duration: 600, ease: 'Quad.easeOut', onComplete: () => e.destroy() });
  }

  // Fissure lumineuse dans le sol (Fendoir)
  crack(x, y, color) {
    const s = this.scene;
    const r = s.add.rectangle(x, y - 4, 34, 6, color, 0.9).setAngle(Phaser.Math.Between(-12, 12)).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: r, alpha: 0, duration: 700, onComplete: () => r.destroy() });
  }

  // Arc de lame (Lame laser)
  slash(x, y, facing, color, radius) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD).setPosition(x, y);
    const a0 = facing > 0 ? -1.3 : Math.PI - 1.3; const a1 = facing > 0 ? 1.1 : Math.PI + 1.1;
    for (const [w, a] of [[34, 0.3], [14, 0.9], [4, 1]]) {
      g.lineStyle(w, a === 1 ? 0xffffff : color, a); g.beginPath();
      if (facing > 0) g.arc(0, 0, radius * 0.6, a0, a1); else g.arc(0, 0, radius * 0.6, a1, a0, true);
      g.strokePath();
    }
    s.tweens.add({ targets: g, scale: 1.25, alpha: 0, duration: 300, onComplete: () => g.destroy() });
  }

  // Parasites numériques (Téléportation)
  glitch(f, color) {
    const s = this.scene;
    for (let i = 0; i < 10; i++) {
      const r = s.add.rectangle(f.x + Phaser.Math.Between(-70, 70), f.y - Phaser.Math.Between(20, 330), Phaser.Math.Between(40, 140), Phaser.Math.Between(4, 14), color, 0.8).setDepth(26).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: r, x: r.x + Phaser.Math.Between(-60, 60), alpha: 0, duration: 260, onComplete: () => r.destroy() });
    }
  }

  // Viseur qui se resserre sur la cible (Protocole Rouge)
  reticle(target, color, dur) {
    const s = this.scene;
    const c = s.add.container(target.x, target.y - 180).setDepth(27);
    const ring = s.add.circle(0, 0, 120, 0, 0).setStrokeStyle(4, color, 1);
    const lines = [[0, -150, 0, -60], [0, 60, 0, 150], [-150, 0, -60, 0], [60, 0, 150, 0]].map(([a, b, cx, d]) => s.add.line(0, 0, a, b, cx, d, color).setLineWidth(4).setOrigin(0));
    c.add([ring, ...lines]);
    const ev = s.time.addEvent({ delay: 16, loop: true, callback: () => c.setPosition(target.x, target.y - 180) });
    s.tweens.add({ targets: c, scale: { from: 1.8, to: 0.7 }, angle: 90, duration: dur, ease: 'Quad.easeIn' });
    s.time.delayedCall(dur + 700, () => { ev.remove(); c.destroy(); });
  }

  // Trait laser droit (Protocole Rouge, flèche géante)
  laserLine(x1, y1, x2, y2, color, width = 10) {
    const s = this.scene;
    const g = s.add.graphics().setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(width * 2.5, color, 0.3); g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(width, color, 1); g.lineBetween(x1, y1, x2, y2);
    g.lineStyle(Math.max(2, width / 3), 0xffffff, 1); g.lineBetween(x1, y1, x2, y2);
    s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
    this.spark(x2, y2, color, true);
  }

  // Anneau de feu (Uppercut de Treichville)
  fireRing(x, y, color) {
    const s = this.scene;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p = s.add.circle(x, y, 14, i % 2 ? 0xffe066 : color, 0.9).setDepth(24).setBlendMode(Phaser.BlendModes.ADD);
      s.tweens.add({ targets: p, x: x + Math.cos(a) * 110, y: y + Math.sin(a) * 110 - 80, alpha: 0, scale: 0.3, duration: 420, onComplete: () => p.destroy() });
    }
  }

  // Lueur de blindage (Crochet Bulldozer)
  armorGlow(f, color, dur) {
    const s = this.scene;
    const e = s.add.ellipse(f.x, f.y - 150, 180, 340, color, 0.12).setStrokeStyle(3, color, 0.8).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
    const ev = s.time.addEvent({ delay: 16, loop: true, callback: () => e.setPosition(f.x, f.y - 150) });
    s.time.delayedCall(dur, () => { ev.remove(); s.tweens.add({ targets: e, alpha: 0, duration: 150, onComplete: () => e.destroy() }); });
  }

  // Racines qui jaillissent du sol (Esprit de la Forêt)
  roots(x, y, color) {
    const s = this.scene;
    for (let i = 0; i < 5; i++) {
      const g = s.add.graphics().setDepth(23);
      const dx = Phaser.Math.Between(-60, 60); const h = Phaser.Math.Between(140, 260); const bend = Phaser.Math.Between(-40, 40);
      for (const [w, c] of [[12, 0x4a3320], [5, color]]) {
        g.lineStyle(w, c, 1); g.beginPath(); g.moveTo(dx, 0);
        g.lineTo(dx + bend * 0.5, -h * 0.5); g.lineTo(dx + bend, -h); g.strokePath();
      }
      g.setPosition(x, y); // dessin relatif au sol : la racine pousse vers le haut
      s.tweens.add({ targets: g, scaleY: { from: 0.01, to: 1 }, duration: 160, onComplete: () => s.tweens.add({ targets: g, alpha: 0, delay: 500, duration: 300, onComplete: () => g.destroy() }) });
    }
    this.burst(x, y - 40, color, 10);
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

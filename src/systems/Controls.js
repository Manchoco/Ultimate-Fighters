import Phaser from 'phaser';

// Fusionne clavier et boutons tactiles en un seul état de commande.
// État « maintenu » : left, right, up, down. Impulsions (vraies une seule image) :
// punch, kick, s1, s2, sup.
const PULSES = ['punch', 'kick', 's1', 's2', 'sup', 'grab', 'taunt'];

export class Controls {
  constructor(scene) {
    this.scene = scene;
    this.state = { left: false, right: false, up: false, down: false, punch: false, kick: false, s1: false, s2: false, sup: false, grab: false, taunt: false };
    this.prevTouch = {};
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard ? scene.input.keyboard.addKeys({
      left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN,
      a: K.A, d: K.D, w: K.W, s: K.S, q: K.Q, z: K.Z, space: K.SPACE,
      j: K.J, k: K.K, l: K.L, i: K.I, o: K.O, u: K.U, h: K.H, t: K.T,
    }) : null;
    this.buttons = [];
    this.touchEnabled = scene.sys.game.device.input.touch;
    if (this.touchEnabled) {
      scene.input.addPointer(4);
      this.buildTouch();
      // en plein écran, les touches grossissent (proportionnellement, ancrées aux coins)
      this.onFs = () => { this.clearTouch(); this.buildTouch(); };
      scene.scale.on('enterfullscreen', this.onFs); scene.scale.on('leavefullscreen', this.onFs);
      // un appui très bref (appui + relâchement dans la même image) serait manqué par la
      // simple lecture de l'état : on enregistre donc chaque appui dès l'événement
      this.queued = {};
      scene.input.on('pointerdown', (p) => {
        for (const b of this.buttons) if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r * 1.25) this.queued[b.id] = true;
      });
    }
  }

  buildTouch() {
    const s = this.scene;
    const W = s.scale.width, H = s.scale.height;
    const k = s.scale.isFullscreen ? 1.25 : 1; // facteur d'agrandissement
    const mk = (id, x0, y0, r0, label, color, kind = 'hold') => {
      // x0, y0 : position mesurée depuis le coin (gauche ou droit) ; tout est mis à l'échelle k
      const x = x0 < W / 2 ? x0 * k : W - (W - x0) * k; const y = H - (H - y0) * k - (k - 1) * 48; const r = r0 * k; // un peu plus haut : ne cache pas la jauge SUPER
      const c = s.add.circle(x, y, r, color, 0.28).setStrokeStyle(3, 0xffffff, 0.55).setScrollFactor(0).setDepth(200);
      const t = s.add.text(x, y, label, { fontFamily: '"Ojuju", sans-serif', fontSize: `${Math.round(r * 0.55)}px`, color: '#fff' })
        .setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0.9);
      this.buttons.push({ id, x, y, r, c, t, kind, color });
    };
    // Croix directionnelle (gauche)
    const cx = 150, cy = H - 150, d = 78, r = 50;
    mk('left', cx - d, cy, r, '◀', 0x222244);
    mk('right', cx + d, cy, r, '▶', 0x222244);
    mk('up', cx, cy - d, r, '▲', 0x222244);
    mk('down', cx, cy + d - 10, r, '▼', 0x222244);
    // Boutons d'action (droite)
    const bx = W - 150, by = H - 150;
    mk('punch', bx - 90, by + 30, 52, 'P', 0x2f7bff, 'pulse');
    mk('kick', bx + 30, by + 50, 52, 'K', 0xe0142c, 'pulse');
    mk('s1', bx - 60, by - 85, 46, 'S1', 0xffa000, 'pulse');
    mk('s2', bx + 55, by - 60, 46, 'S2', 0x3fae3a, 'pulse');
    mk('sup', bx + 95, by - 165, 44, 'SUP', 0xb040ff, 'pulse');
    mk('grab', bx - 195, by - 45, 42, 'PRISE', 0x8a5a2e, 'pulse');
    mk('taunt', bx - 200, by + 75, 30, 'PROV.', 0x444444, 'pulse');
  }

  clearTouch() { this.buttons.forEach((b) => { b.c.destroy(); b.t.destroy(); }); this.buttons = []; }

  setSuperReady(ready) {
    const b = this.buttons.find((x) => x.id === 'sup');
    if (b) b.c.setFillStyle(b.color, ready ? 0.75 : 0.18);
  }

  update() {
    const st = this.state;
    for (const p of PULSES) st[p] = false;
    const k = this.keys; const JD = Phaser.Input.Keyboard.JustDown;
    let left = false, right = false, up = false, down = false;
    if (k) {
      left = k.left.isDown || k.a.isDown || k.q.isDown;
      right = k.right.isDown || k.d.isDown;
      up = k.up.isDown || k.w.isDown || k.z.isDown || k.space.isDown;
      down = k.down.isDown || k.s.isDown;
      if (JD(k.j)) st.punch = true;
      if (JD(k.k)) st.kick = true;
      if (JD(k.l)) st.s1 = true;
      if (JD(k.i) || JD(k.u)) st.s2 = true;
      if (JD(k.o)) st.sup = true;
      if (JD(k.h)) st.grab = true;
      if (JD(k.t)) st.taunt = true;
    }
    if (this.touchEnabled) {
      const pointers = this.scene.input.manager.pointers.filter((p) => p.isDown);
      const now = {};
      for (const b of this.buttons) {
        const hit = pointers.some((p) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r * 1.25);
        now[b.id] = hit;
        b.c.setScale(hit ? 0.9 : 1);
        if (b.kind === 'pulse' && ((hit && !this.prevTouch[b.id]) || this.queued[b.id])) st[b.id] = true;
      }
      // une direction tapée brièvement compte quand même pour cette image (utile pour le saut)
      left = left || now.left || !!this.queued.left; right = right || now.right || !!this.queued.right;
      up = up || now.up || !!this.queued.up; down = down || now.down || !!this.queued.down;
      this.prevTouch = now;
      this.queued = {};
    }
    st.left = left; st.right = right; st.up = up; st.down = down;
    return st;
  }

  destroy() {
    this.clearTouch();
    if (this.onFs) { this.scene.scale.off('enterfullscreen', this.onFs); this.scene.scale.off('leavefullscreen', this.onFs); }
  }
}

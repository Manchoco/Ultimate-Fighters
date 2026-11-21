// Intelligence de l'ordinateur. Elle produit le même état de commande qu'un joueur.
// Niveaux : 0 = Facile, 1 = Normal, 2 = Difficile.
const LEVELS = [
  { think: [420, 650], block: 0.18, aggro: 0.45, special: 0.12, superUse: 0.35 },
  { think: [230, 400], block: 0.45, aggro: 0.6, special: 0.22, superUse: 0.65 },
  { think: [120, 220], block: 0.72, aggro: 0.72, special: 0.32, superUse: 0.9 },
];

const RANGED = ['projectile', 'rain'];

export class AI {
  constructor(fighter, level = 1) {
    this.f = fighter;
    this.cfg = LEVELS[level] || LEVELS[1];
    this.timer = 0;
    this.intent = 'idle';
    this.holdT = 0;
    this.state = { left: false, right: false, up: false, down: false, punch: false, kick: false, s1: false, s2: false, sup: false };
  }

  rand(a, b) { return a + Math.random() * (b - a); }

  update(dt) {
    const st = this.state;
    st.punch = st.kick = st.s1 = st.s2 = st.sup = false;
    const f = this.f; const o = f.opponent;
    if (!f.alive || !o || !o.alive) { st.left = st.right = st.up = st.down = false; return st; }
    const dist = Math.abs(o.x - f.x);
    const toward = o.x > f.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';

    // Réaction défensive immédiate quand l'adversaire attaque à portée
    const threat = (o.state === 'attack' || o.state === 'special') && dist < 260;
    const projectileNear = f.scene.projectiles.some((p) => p.owner !== f && Math.abs(p.x - f.x) < 330 && Math.sign(p.vx) === Math.sign(f.x - p.x));
    if ((threat || projectileNear) && !f.busy) {
      if (this.blockDecision === undefined) this.blockDecision = Math.random() < this.cfg.block;
      if (this.blockDecision) {
        st[away] = true; st[toward] = false; st.up = false;
        if (projectileNear && Math.random() < 0.04 * (1 + this.cfg.aggro)) { st.up = true; st[toward] = true; st[away] = false; }
        return st;
      }
    } else this.blockDecision = undefined;

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.rand(...this.cfg.think);
      this.decide(dist, o);
    }

    st.left = st.right = st.up = st.down = false;
    switch (this.intent) {
      case 'approach': st[toward] = true; break;
      case 'retreat': st[away] = true; break;
      case 'jumpin': st.up = true; st[toward] = true; this.intent = 'air'; break;
      case 'air': if (!f.grounded && Math.abs(o.x - f.x) < 200) { st.kick = true; this.intent = 'idle'; } break;
      case 'crouch': st.down = true; break;
      default: break;
    }
    if (this.pending) { st[this.pending] = true; if (this.pending === 'lowkick') { st.down = true; st.kick = true; st.lowkick = false; } this.pending = null; }
    return st;
  }

  decide(dist, o) {
    const f = this.f; const c = this.cfg;
    const ranged1 = RANGED.includes(f.data.s1.type);
    const ranged2 = RANGED.includes(f.data.s2.type);
    if (f.superM >= 100 && dist < 520 && Math.random() < c.superUse) { this.pending = 'sup'; return; }

    if (dist > 420) {
      if ((ranged1 && f.cool.s1 <= 0 && Math.random() < c.special * 2.2)) { this.pending = 's1'; this.intent = 'idle'; return; }
      if ((ranged2 && f.cool.s2 <= 0 && Math.random() < c.special * 1.6)) { this.pending = 's2'; this.intent = 'idle'; return; }
      if (f.data.s2.type === 'teleport' && f.cool.s2 <= 0 && Math.random() < c.special) { this.pending = 's2'; return; }
      this.intent = Math.random() < 0.12 * c.aggro ? 'jumpin' : 'approach';
      return;
    }
    if (dist > 190) {
      const r = Math.random();
      if (r < c.special && f.cool.s1 <= 0 && ['dash', 'spin', 'projectile'].includes(f.data.s1.type)) { this.pending = 's1'; return; }
      if (r < c.special * 1.5 && f.cool.s2 <= 0 && ['dash', 'spin', 'rain'].includes(f.data.s2.type)) { this.pending = 's2'; return; }
      if (r < 0.2) { this.intent = 'jumpin'; return; }
      this.intent = Math.random() < c.aggro ? 'approach' : (Math.random() < 0.5 ? 'idle' : 'retreat');
      return;
    }
    // Corps à corps
    const r = Math.random();
    if (r < c.special && f.cool.s1 <= 0) { this.pending = 's1'; this.intent = 'idle'; return; }
    if (r < c.special * 1.6 && f.cool.s2 <= 0 && !['rain', 'shield'].includes(f.data.s2.type)) { this.pending = 's2'; this.intent = 'idle'; return; }
    if (r < 0.5) { this.pending = 'punch'; this.intent = 'idle'; return; }
    if (r < 0.75) { this.pending = 'kick'; this.intent = 'idle'; return; }
    if (r < 0.85) { this.pending = 'lowkick'; this.intent = 'idle'; return; }
    this.intent = Math.random() < 0.5 ? 'retreat' : 'idle';
    void o;
  }
}

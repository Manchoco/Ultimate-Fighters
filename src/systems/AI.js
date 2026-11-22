// Intelligence de l'ordinateur. Elle produit le même état de commande qu'un joueur.
// Niveaux : 0 = Facile, 1 = Normal, 2 = Difficile.
import { MOVES } from './Moves.js';
const LEVELS = [
  { think: [420, 650], block: 0.18, aggro: 0.45, special: 0.12, superUse: 0.35 },
  { think: [230, 400], block: 0.45, aggro: 0.6, special: 0.22, superUse: 0.65 },
  { think: [120, 220], block: 0.72, aggro: 0.72, special: 0.32, superUse: 0.9 },
];


export class AI {
  constructor(fighter, level = 1) {
    this.f = fighter;
    this.cfg = LEVELS[level] || LEVELS[1];
    this.timer = 0;
    this.intent = 'idle';
    this.holdT = 0;
    this.state = { left: false, right: false, up: false, down: false, punch: false, kick: false, s1: false, s2: false, sup: false, grab: false, taunt: false, dash: null };
  }

  rand(a, b) { return a + Math.random() * (b - a); }

  update(dt) {
    const st = this.state;
    st.punch = st.kick = st.s1 = st.s2 = st.sup = st.grab = st.taunt = false; st.dash = null;
    const f = this.f; const o = f.opponent;
    if (!f.alive || !o || !o.alive) { st.left = st.right = st.up = st.down = false; return st; }
    // saisi : tente de se dégager (plus souvent en difficile)
    if (f.state === 'grabbed') {
      if (this.techRoll === undefined) this.techRoll = Math.random() < this.cfg.block * 0.5;
      if (this.techRoll && f.stateT > 80) st.grab = true;
      return st;
    }
    this.techRoll = undefined;
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
    if (this.pending === 'dashfwd' || this.pending === 'dashback') { st.dash = this.pending === 'dashfwd' ? 'fwd' : 'back'; this.pending = null; }
    if (this.pending) { st[this.pending] = true; if (this.pending === 'lowkick') { st.down = true; st.kick = true; st.lowkick = false; } this.pending = null; }
    return st;
  }

  decide(dist, o) {
    const f = this.f; const c = this.cfg;
    const tag = (slot) => MOVES[f.data[slot].id].ai;
    const ready = (slot) => f.cool[slot] <= 0;
    const pick = (want) => ['s1', 's2'].find((sl) => ready(sl) && tag(sl) === want);
    if (f.superM >= 100 && dist < 560 && Math.random() < c.superUse) { this.pending = 'sup'; return; }

    if (dist > 420) {
      if (Math.random() < 0.05) { this.pending = 'taunt'; this.intent = 'idle'; return; } // mimique de loin
      if (Math.random() < 0.18 * c.aggro) { this.pending = 'dashfwd'; return; }
      const sl = pick('far');
      if (sl && Math.random() < c.special * 2.2) { this.pending = sl; this.intent = 'idle'; return; }
      this.intent = Math.random() < 0.12 * c.aggro ? 'jumpin' : 'approach';
      return;
    }
    if (dist > 190) {
      const sl = pick('mid') || pick('far');
      if (sl && Math.random() < c.special * 1.6) { this.pending = sl; return; }
      if (Math.random() < 0.2) { this.intent = 'jumpin'; return; }
      this.intent = Math.random() < c.aggro ? 'approach' : (Math.random() < 0.5 ? 'idle' : 'retreat');
      return;
    }
    // Corps à corps : contre un adversaire qui se protège, la prise passe la garde
    if ((o.state === 'block' || o.holdingBack) && Math.random() < 0.3 + c.aggro * 0.2) { this.pending = 'grab'; this.intent = 'idle'; return; }
    if (Math.random() < 0.08) { this.pending = 'grab'; this.intent = 'idle'; return; }
    if (Math.random() < 0.06 * c.aggro) { this.pending = Math.random() < 0.5 ? 'dashback' : 'dashfwd'; return; }
    const r = Math.random();
    const close = pick('close') || pick('mid');
    if (close && r < c.special * 1.5) { this.pending = close; this.intent = 'idle'; return; }
    const def = pick('def');
    if (def && (o.state === 'attack' || o.state === 'special') && Math.random() < c.block) { this.pending = def; return; }
    if (r < 0.5) { this.pending = 'punch'; this.intent = 'idle'; return; }
    if (r < 0.75) { this.pending = 'kick'; this.intent = 'idle'; return; }
    if (r < 0.85) { this.pending = 'lowkick'; this.intent = 'idle'; return; }
    this.intent = Math.random() < 0.5 ? 'retreat' : 'idle';
  }
}

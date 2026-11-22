// Intelligence de l'ordinateur. Elle produit le même état de commande qu'un joueur.
// Niveaux : 0 = Facile, 1 = Normal, 2 = Difficile.
import { MOVES } from './Moves.js';
import { Adapt } from './Adapt.js';

// Préréglages. Le niveau réellement utilisé est un nombre décimal entre 0 et 2 (préréglage
// + adaptation au joueur, voir Adapt.js) : les valeurs sont interpolées entre deux préréglages.
//   think  : temps de réflexion entre deux décisions (ms)   react : délai avant de réagir à une attaque (ms)
//   block  : probabilité de parer    aggro : envie d'avancer   special / superUse : usage des coups spéciaux
//   grab   : usage des prises        hesit : probabilité de rester sans rien faire (laisse respirer)
//   dmg    : multiplicateur des dégâts infligés par l'ordinateur
const LEVELS = [
  { think: [700, 1050], react: 480, block: 0.06, aggro: 0.3, special: 0.05, superUse: 0.2, grab: 0.05, hesit: 0.4, dmg: 0.6 },
  { think: [420, 650], react: 300, block: 0.22, aggro: 0.45, special: 0.12, superUse: 0.45, grab: 0.15, hesit: 0.18, dmg: 0.82 },
  { think: [180, 300], react: 150, block: 0.55, aggro: 0.65, special: 0.24, superUse: 0.8, grab: 0.3, hesit: 0.06, dmg: 0.95 },
];
function lerpLevel(x) {
  const i = Math.min(1, Math.floor(x)); const t = x - i; const a = LEVELS[i], b = LEVELS[i + 1];
  const out = {};
  for (const k in a) out[k] = Array.isArray(a[k]) ? a[k].map((v, j) => v + (b[k][j] - v) * t) : a[k] + (b[k] - a[k]) * t;
  return out;
}


export class AI {
  constructor(fighter, level = 1) {
    this.f = fighter;
    this.level = level;
    this.base = lerpLevel(Adapt.effective(level));
    this.cfg = this.base; this.threatT = 0;
    this.timer = 0;
    this.intent = 'idle';
    this.holdT = 0;
    this.state = { left: false, right: false, up: false, down: false, punch: false, kick: false, s1: false, s2: false, sup: false, grab: false, taunt: false, dash: null };
  }

  rand(a, b) { return a + Math.random() * (b - a); }

  // Recalcule le niveau après une fin de round (l'adaptation a pu bouger)
  refresh() { this.base = lerpLevel(Adapt.effective(this.level)); }

  // Second souffle : si le joueur est en grande difficulté, l'ordinateur relâche la pression
  // (et inversement s'il domine trop facilement). Effet modéré, jamais visible comme une triche.
  tune() {
    const me = this.f, pl = me.opponent; const b = this.base;
    const gap = (me.hp - pl.hp) / 1000; // > 0 : l'ordinateur mène
    const k = gap > 0.35 ? -Math.min(0.5, (gap - 0.35) * 1.2) : gap < -0.5 ? Math.min(0.25, (-gap - 0.5) * 0.6) : 0;
    this.cfg = {
      ...b,
      block: Math.max(0, b.block * (1 + k)), aggro: Math.max(0.1, b.aggro * (1 + k * 0.6)), special: Math.max(0, b.special * (1 + k)),
      hesit: Math.min(0.6, b.hesit * (1 - k * 1.5)), react: b.react * (1 - k * 0.5), dmg: b.dmg * (1 + k * 0.3),
    };
  }

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
    if (threat || projectileNear) this.threatT += dt; else this.threatT = 0;
    if ((threat || projectileNear) && !f.busy && this.threatT >= this.cfg.react) { // il lui faut le temps de voir venir le coup
      if (this.blockDecision === undefined) this.blockDecision = Math.random() < this.cfg.block;
      if (this.blockDecision) {
        st[away] = true; st[toward] = false; st.up = false;
        if (projectileNear && Math.random() < 0.04 * (1 + this.cfg.aggro)) { st.up = true; st[toward] = true; st[away] = false; }
        return st;
      }
    } else if (!threat && !projectileNear) this.blockDecision = undefined;

    this.timer -= dt;
    if (this.timer <= 0) {
      this.tune();
      this.timer = this.rand(...this.cfg.think);
      if (Math.random() < this.cfg.hesit) this.intent = Math.random() < 0.5 ? 'idle' : 'retreat'; // hésite : laisse une ouverture
      else this.decide(dist, o);
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
    if ((o.state === 'block' || o.holdingBack) && Math.random() < c.grab * 1.6) { this.pending = 'grab'; this.intent = 'idle'; return; }
    if (Math.random() < c.grab * 0.4) { this.pending = 'grab'; this.intent = 'idle'; return; }
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

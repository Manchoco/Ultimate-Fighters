// Adaptation de l'IA au niveau du joueur.
// Pour chaque difficulté on garde un « décalage » : négatif = l'IA joue plus doucement que
// le préréglage, positif = plus fort. Il bouge à chaque fin de round selon le résultat
// et l'écart de vie, et il est mémorisé sur l'appareil (le joueur retrouve son réglage).
// Le décalage reste dans une plage propre à chaque difficulté : Facile reste facile,
// Difficile reste exigeant.
const KEY = 'uf_adapt_v1';
const RANGE = [[-0.6, 0.45], [-0.7, 0.5], [-0.5, 0.35]]; // [min, max] pour Facile, Normal, Difficile

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* stockage indisponible */ } }

export const Adapt = {
  offset(level) { return load()[level] || 0; },

  // Niveau effectif (nombre décimal entre 0 et 2) utilisé par l'IA
  effective(level) { return Math.max(0, Math.min(2, level + this.offset(level))); },

  // Fin de round : le joueur a-t-il gagné, et avec quel écart de vie (de -1000 à +1000) ?
  roundEnd(level, playerWon, hpDiff) {
    if (playerWon === null) return this.offset(level);
    const d = load(); const [lo, hi] = RANGE[level] || RANGE[1];
    const margin = Math.min(1, Math.abs(hpDiff) / 1000);
    // une défaite nette fait baisser plus vite qu'une victoire ne fait monter :
    // on veut surtout éviter qu'un joueur reste bloqué
    const step = playerWon ? 0.08 + 0.14 * margin : -(0.12 + 0.2 * margin);
    d[level] = Math.max(lo, Math.min(hi, (d[level] || 0) + step));
    save(d);
    return d[level];
  },

  reset() { save({}); },
};

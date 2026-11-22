import { FIGHTERS } from '../data/fighters.js';

// Progression sauvegardée sur l'appareil (localStorage) : défis réussis, déblocages,
// meilleur score. Aucune donnée personnelle, rien n'est envoyé sur Internet.
const KEY = 'uf_progress_v1';

export const CHALLENGES = [
  { id: 'combo5', name: 'Enchaîneur', desc: 'Réussir un combo de 5 coups' },
  { id: 'combo8', name: 'Inarrêtable', desc: 'Réussir un combo de 8 coups' },
  { id: 'perfect', name: 'Intouchable', desc: 'Gagner un round sans prendre un seul coup' },
  { id: 'superko', name: 'Coup de grâce', desc: 'Mettre K.O. avec une super attaque' },
  { id: 'speed', name: 'Éclair', desc: 'Gagner un round en moins de 20 secondes' },
  { id: 'cancel10', name: 'Fluide', desc: 'Faire 10 enchaînements dans un même combat' },
  { id: 'wall', name: 'Muraille', desc: 'Parer 15 coups dans un même combat' },
  { id: 'arcade', name: 'Champion', desc: 'Terminer le mode Arcade' },
  { id: 'arcadeHard', name: 'Légende', desc: 'Terminer le mode Arcade en Difficile' },
  { id: 'arcade3', name: 'Polyvalent', desc: 'Terminer l\'Arcade avec 3 combattants différents' },
  { id: 'all8', name: 'Toute l\'équipe', desc: 'Gagner un combat avec chacun des 8 combattants' },
  { id: 'score100k', name: 'Grand score', desc: 'Dépasser 100 000 points en Arcade' },
];

// Récompenses
export const UNLOCKS = {
  ahouAt: 5, // Ahou la Nuit se débloque après 5 défis
  goldAt: 12, // tenue dorée pour tous après les 12 défis
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* stockage indisponible */ } }

export const Progress = {
  get() {
    const p = load();
    p.done = p.done || {}; p.costumes = p.costumes || {}; p.arcadeWith = p.arcadeWith || {}; p.wonWith = p.wonWith || {};
    p.best = p.best || 0;
    return p;
  },
  doneCount() { return Object.keys(this.get().done).length; },
  isDone(id) { return !!this.get().done[id]; },
  ahouUnlocked() { return this.doneCount() >= UNLOCKS.ahouAt; },
  // tenues disponibles pour un combattant : 0 = normale, 1 = alternative, 2 = dorée
  costumes(fid) {
    const p = this.get(); const list = [0];
    if (p.costumes[fid]) list.push(1);
    if (this.doneCount() >= UNLOCKS.goldAt) list.push(2);
    return list;
  },

  // Appelé à la fin de chaque combat. Renvoie les défis et déblocages obtenus.
  recordMatch(cfg, won, stats, score) {
    const p = this.get();
    if (cfg.mode === 'training' || !stats) return { news: [], unlocks: [], best: p.best };
    const before = Object.keys(p.done).length;
    const news = [];
    const done = (id) => { if (!p.done[id]) { p.done[id] = Date.now(); news.push(CHALLENGES.find((c) => c.id === id)); } };
    const s = stats.p1;
    if (s.maxCombo >= 5) done('combo5');
    if (s.maxCombo >= 8) done('combo8');
    if (stats.perfectRounds > 0) done('perfect');
    if (s.superKO > 0) done('superko');
    if (stats.fastestWin < 20) done('speed');
    if (s.cancels >= 10) done('cancel10');
    if (s.blocks >= 15) done('wall');
    const unlocks = [];
    if (won) {
      p.wonWith[cfg.p1] = true;
      if (FIGHTERS.every((f) => p.wonWith[f.id])) done('all8');
      const champion = cfg.mode === 'arcade' && cfg.ladderIndex >= cfg.ladder.length - 1;
      if (champion) {
        done('arcade');
        if (cfg.level >= 2) done('arcadeHard');
        p.arcadeWith[cfg.p1] = true;
        if (Object.keys(p.arcadeWith).length >= 3) done('arcade3');
        if (!p.costumes[cfg.p1]) {
          p.costumes[cfg.p1] = true;
          const f = FIGHTERS.find((x) => x.id === cfg.p1);
          if (f) unlocks.push(`Tenue alternative de ${f.name}`);
        }
      }
    }
    if (cfg.mode === 'arcade' && score >= 100000) done('score100k');
    if (cfg.mode === 'arcade') p.best = Math.max(p.best, score);
    const after = Object.keys(p.done).length;
    if (before < UNLOCKS.ahouAt && after >= UNLOCKS.ahouAt) unlocks.push('Nouvelle combattante : Ahou la Nuit');
    if (before < UNLOCKS.goldAt && after >= UNLOCKS.goldAt) unlocks.push('Tenue dorée pour tous les combattants');
    save(p);
    return { news, unlocks, best: p.best };
  },
};

// Tenues : 1 = couleurs alternatives (rotation de teinte), 2 = dorée
export function applyCostume(sprite, costume) {
  if (!costume || !sprite.preFX) return; // effet disponible seulement en WebGL
  const cm = sprite.preFX.addColorMatrix();
  if (costume === 1) cm.hue(150);
  if (costume === 2) { cm.sepia(); cm.saturate(0.6, true); cm.brightness(1.15, true); }
}

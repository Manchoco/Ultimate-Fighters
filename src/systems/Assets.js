import Phaser from 'phaser';
import { STAGES } from '../data/stages.js';
import { fighterById } from '../data/fighters.js';

// Chargement à la demande et en arrière-plan.
// Au démarrage, on ne télécharge que le menu et la sélection. Le reste (animations des
// combattants, décors en grand, musiques) est téléchargé quand il devient utile, le plus tôt
// possible : dès qu'un combattant est choisi, pendant l'introduction du mode Histoire, ou
// pendant le combat pour le suivant. Le chargeur vit dans une scène permanente ('Loader')
// pour continuer d'un écran à l'autre (le chargeur d'une scène s'arrête quand on la quitte).

// adresse versionnée : le cache du navigateur est vidé à chaque nouvelle publication
export const V = (url) => `${url}?v=${__BUILD__}`;

export const Assets = {
  scene: null,
  waiters: [],
  failed: new Set(),

  // ----- descriptions des fichiers -----
  stage: (id) => ({ type: 'image', key: `st_${id}`, url: V(`assets/stages/${id}.webp`) }),
  thumb: (id) => ({ type: 'image', key: `stt_${id}`, url: V(`assets/stages/thumb_${id}.webp`) }),
  art: (id) => ({ type: 'image', key: `f_${id}`, url: V(`assets/fighters/${id}.webp`) }),
  portrait: (id) => ({ type: 'image', key: `p_${id}`, url: V(`assets/portraits/${id}.webp`) }),
  music: (k) => ({ type: 'audio', key: k, url: [V(`assets/audio/${k}.ogg`), V(`assets/audio/${k}.mp3`)] }),
  rig(id) {
    const r = this.scene.cache.json.get('rigs')[id];
    return { type: 'spritesheet', key: `r_${id}`, url: V(`assets/rigs/${id}.webp`), cfg: { frameWidth: r.frameWidth, frameHeight: r.frameHeight } };
  },

  // musique d'un combat : celle de l'arène, ou celle du boss contre Kôrô
  fightMusic(cfg) { return fighterById(cfg.p2)?.boss ? 'theme3' : (STAGES.find((s) => s.id === cfg.stage)?.music || 'theme1'); },

  // tout ce qu'il faut pour un combat (et l'écran de résultat qui suit)
  forFight(cfg, musicKey = this.fightMusic(cfg)) {
    return [this.rig(cfg.p1), this.rig(cfg.p2), this.stage(cfg.stage), this.art(cfg.p1), this.art(cfg.p2),
      this.music(musicKey), this.music('victory')];
  },

  has(d) {
    const s = this.scene;
    return d.type === 'audio' ? s.cache.audio.exists(d.key) : s.textures.exists(d.key);
  },

  // Télécharge ce qui manque, puis appelle cb (immédiatement si tout est déjà là).
  // onProgress(0..1) est appelé pendant l'attente.
  ensure(list, cb, onProgress) {
    const s = this.scene;
    const missing = list.filter((d) => !this.has(d) && !this.failed.has(d.key));
    if (!missing.length) { cb?.(); return; }
    for (const d of missing) {
      if (d.type === 'spritesheet') s.load.spritesheet(d.key, d.url, d.cfg);
      else if (d.type === 'audio') s.load.audio(d.key, d.url);
      else s.load.image(d.key, d.url);
    }
    this.waiters.push({ list, cb, onProgress });
    if (!s.load.isLoading()) s.load.start();
  },

  prefetch(list) { this.ensure(list, null); },

  check() {
    this.waiters = this.waiters.filter((w) => {
      const done = w.list.filter((d) => this.has(d) || this.failed.has(d.key)).length;
      if (done >= w.list.length) { w.cb?.(); return false; }
      w.onProgress?.(done / w.list.length);
      return true;
    });
  },

  // clé du décor à afficher : la grande image si elle est là, sinon la vignette
  stageKey(id) { return this.scene.textures.exists(`st_${id}`) ? `st_${id}` : `stt_${id}`; },
};

// Scène permanente et invisible qui porte le chargeur
export class LoaderScene extends Phaser.Scene {
  constructor() { super({ key: 'Loader' }); }
  create() {
    Assets.scene = this;
    this.load.maxParallelDownloads = 6;
    this.load.on('filecomplete', () => Assets.check());
    this.load.on('loaderror', (f) => { Assets.failed.add(f.key); console.warn('Fichier manquant :', f.key); });
    this.load.on('complete', () => Assets.check());
  }
}

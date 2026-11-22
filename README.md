# Ultimate Fighters

Jeu de combat 2D jouable dans le navigateur, sur PC et sur téléphone.
8 combattants originaux s'affrontent dans 8 grands lieux de Côte d'Ivoire.

## Jouer

- **Arcade** : choisis ton combattant et bats les 7 autres à la suite.
- **Combat libre** : choisis ton combattant, ton adversaire et l'arène.
- Trois niveaux de difficulté : Facile, Normal, Difficile.

### Commandes PC
| Action | Touches |
|---|---|
| Se déplacer | ← → ou Q D |
| Sauter / s'accroupir | ↑ ou Z / ↓ ou S |
| Se protéger | reculer (sens opposé à l'adversaire) |
| Poing / Pied | J / K |
| Spécial 1 / Spécial 2 | L / I |
| Super | O (quand la jauge clignote) |
| Pause | Échap |

### Commandes téléphone
Mode paysage. Croix à gauche, boutons **P** (poing), **K** (pied), **S1**, **S2**, **SUP** à droite.

## Développement

```bash
npm install
npm run dev      # serveur local
npm run build    # version de production dans dist/
```

Technologies : [Phaser 3](https://phaser.io) + Vite. Les poses sont générées par `tools/rig.py`. Déploiement : Vercel.

## Crédits

- Illustrations des combattants : créées à partir des visuels fournis par Manchoco (générées avec Canva IA, détourées). Kôrô, le boss du mode Histoire, est un personnage original généré avec Canva IA.
- Arènes : visuels fournis par Manchoco.
- Animations : poses articulées (tête, bras, jambes) générées par déformation « marionnette » de chaque illustration, à partir d'un squelette détecté automatiquement.
- Polices (licence OFL, programme des polices africaines de Google Fonts) : **Sankofa Display** (Batsirai Madzonga) pour les titres, **Ojuju** (Chisaokwu Joboson) pour l'interface.
- Bruitages : synthétisés directement dans le navigateur (Web Audio).
- Musiques, toutes sous licence **CC0** (domaine public), via OpenGameArt.org :
  - Menu : « Tropical Loop » — https://opengameart.org/content/tropical-loop
  - Thème 1 : « JRPG Epic Rock Battle Theme #1 » — HydroGene — https://opengameart.org/content/jrpg-epic-rock-battle-theme-1
  - Thème 2 : « Fast fight / battle music (looped) » — Ville Nousiainen (mutkanto) — https://opengameart.org/content/fast-fight-battle-music-looped
  - Thème 3 : « Boss Battle (loop) » — Alex McCulloch (Pro Sensory) — https://opengameart.org/content/boss-battle-loop
  - Victoire : « Victory » — https://opengameart.org/content/victory
- « Coupé-décalé d'Ultimate Fighters » (Place du Grand Tambour, Stade d'Ebimpé, Palais du Gouverneur) : morceau original composé et synthétisé pour le jeu (`tools/coupe.py`), sans échantillon externe.
- Voix de l'annonceur : voix de synthèse du navigateur, remplaçable par tes propres enregistrements (voir [VOIX.md](VOIX.md)).

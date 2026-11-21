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

Technologies : [Phaser 3](https://phaser.io) + Vite. Déploiement : Vercel.

## Crédits

- Illustrations des combattants : créées à partir des visuels fournis par Manchoco (générées avec Canva IA, détourées).
- Arènes : visuels fournis par Manchoco.
- Bruitages : synthétisés directement dans le navigateur (Web Audio).
- Musiques, toutes sous licence **CC0** (domaine public), via OpenGameArt.org :
  - Menu : « Tropical Loop » — https://opengameart.org/content/tropical-loop
  - Thème 1 : « JRPG Epic Rock Battle Theme #1 » — HydroGene — https://opengameart.org/content/jrpg-epic-rock-battle-theme-1
  - Thème 2 : « Fast fight / battle music (looped) » — Ville Nousiainen (mutkanto) — https://opengameart.org/content/fast-fight-battle-music-looped
  - Thème 3 : « Boss Battle (loop) » — Alex McCulloch (Pro Sensory) — https://opengameart.org/content/boss-battle-loop
  - Victoire : « Victory » — https://opengameart.org/content/victory

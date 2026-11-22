# Voix de l'annonceur — fichiers à enregistrer

Le jeu utilise ta voix pour chaque annonce dont l'enregistrement existe, sinon la voix de synthèse du navigateur.

## Comment ajouter tes enregistrements

1. Enregistre chaque phrase dans un fichier **MP3** (ou OGG), un fichier par phrase, sans silence au début ni à la fin.
2. Nomme chaque fichier exactement comme dans la colonne « Fichier » (minuscules, sans accent).
3. Dépose les fichiers dans `public/assets/voice/`.
4. Liste-les dans `public/assets/voice/voices.json`, par exemple : `{ "files": ["ko.mp3", "combattez.mp3", "manchoco.mp3"] }`
5. Pousse sur GitHub : Vercel redéploie le jeu tout seul.

Une annonce composée (ex. « Manchoco contre Kanga ») n'utilise ta voix que si **tous** ses morceaux existent ; sinon elle reste en voix de synthèse.

## Annonces du combat

| Fichier | Phrase |
|---|---|
| `round1.mp3` | Round 1 |
| `round2.mp3` | Round 2 |
| `roundfinal.mp3` | Round final |
| `combattez.mp3` | Combattez ! |
| `ko.mp3` | K.O. ! |
| `temps.mp3` | Temps écoulé ! |
| `egalite.mp3` | Égalité ! |
| `victoire.mp3` | Victoire ! |
| `defaite.mp3` | Défaite… |
| `contre.mp3` | « contre » (entre deux noms) |
| `champion.mp3` | « champion d'Ultimate Fighters ! » (après le nom) |
| `finhistoire.mp3` | « Fin de l'histoire de » (avant le nom) |

## Noms des combattants

| Fichier | Phrase |
|---|---|
| `manchoco.mp3` | Manchoco |
| `doyen.mp3` | Le Doyen |
| `akissi.mp3` | Akissi la Panthère |
| `kanga.mp3` | Kanga le Colosse |
| `k225.mp3` | Unité K-225 |
| `aya.mp3` | Aya Spark |
| `kid.mp3` | Kid Treichville |
| `archer.mp3` | L'Archer du Banco |
| `ahou.mp3` | Ahou la Nuit |
| `koro.mp3` | Kôrô |

## Noms des super attaques

| Fichier | Phrase |
|---|---|
| `stormAbidjan.mp3` | Orage sur Abidjan |
| `bronzeHands.mp3` | Mains de Bronze |
| `pantherDance.mp3` | Danse de la Panthère |
| `ancestralFury.mp3` | Fureur Ancestrale |
| `redProtocol.mp3` | Protocole Rouge |
| `overcharge.mp3` | Surcharge |
| `koExpress.mp3` | K.-O. Express |
| `forestSpirit.mp3` | Esprit de la Forêt |
| `eternalNight.mp3` | Nuit éternelle |
| `maskDance.mp3` | Danse des masques |


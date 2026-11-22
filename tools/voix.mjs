// Génère VOIX.md : la liste des phrases que l'annonceur peut enregistrer (node tools/voix.mjs > VOIX.md)
import { ALL_FIGHTERS } from '../src/data/fighters.js';

const L = [
  '# Voix de l\'annonceur — fichiers à enregistrer', '',
  'Le jeu utilise ta voix pour chaque annonce dont l\'enregistrement existe, sinon la voix de synthèse du navigateur.', '',
  '## Comment ajouter tes enregistrements', '',
  '1. Enregistre chaque phrase dans un fichier **MP3** (ou OGG), un fichier par phrase, sans silence au début ni à la fin.',
  '2. Nomme chaque fichier exactement comme dans la colonne « Fichier » (minuscules, sans accent).',
  '3. Dépose les fichiers dans `public/assets/voice/`.',
  '4. Liste-les dans `public/assets/voice/voices.json`, par exemple : `{ "files": ["ko.mp3", "combattez.mp3", "manchoco.mp3"] }`',
  '5. Pousse sur GitHub : Vercel redéploie le jeu tout seul.', '',
  'Une annonce composée (ex. « Manchoco contre Kanga ») n\'utilise ta voix que si **tous** ses morceaux existent ; sinon elle reste en voix de synthèse.', '',
];
const table = (title, rows) => { L.push(`## ${title}`, '', '| Fichier | Phrase |', '|---|---|', ...rows.map(([f, t]) => `| \`${f}.mp3\` | ${t} |`), ''); };
table('Annonces du combat', [
  ['round1', 'Round 1'], ['round2', 'Round 2'], ['roundfinal', 'Round final'],
  ['combattez', 'Combattez !'], ['ko', 'K.O. !'], ['temps', 'Temps écoulé !'], ['egalite', 'Égalité !'],
  ['victoire', 'Victoire !'], ['defaite', 'Défaite…'], ['contre', '« contre » (entre deux noms)'],
  ['champion', '« champion d\'Ultimate Fighters ! » (après le nom)'], ['finhistoire', '« Fin de l\'histoire de » (avant le nom)'],
]);
table('Noms des combattants', ALL_FIGHTERS.map((x) => [x.id, x.name]));
table('Noms des super attaques', ALL_FIGHTERS.map((x) => [x.sup.id, x.sup.name]));
console.log(L.join('\n'));

// Casting validé (fiche « Ultimate Fighters — Fiche des combattants et des arènes »).
// Stats de 1 à 5 : speed (vitesse), power (puissance), defense (défense).
// Types de coups spéciaux gérés par Fighter.js :
//   projectile · dash · counter · teleport · rain · grab · shield · uppercut · heavy · spin
// Types de super : rush (enchaînement au corps à corps) · beam (rayon) · storm (pluie d'impacts)

export const FIGHTERS = [
  {
    id: 'manchoco', name: 'Manchoco', title: 'Le héros d\'Abidjan',
    color: 0x2f7bff, stats: { speed: 4, power: 4, defense: 3 },
    s1: { type: 'projectile', name: 'Poing Volt', color: 0x5fb4ff },
    s2: { type: 'dash', name: 'Ruée électrique', color: 0x5fb4ff },
    sup: { type: 'storm', name: 'Orage sur Abidjan', color: 0x7fc8ff },
  },
  {
    id: 'doyen', name: 'Le Doyen', title: 'Maître des paumes',
    color: 0xd9a520, stats: { speed: 3, power: 4, defense: 4 },
    s1: { type: 'projectile', name: 'Paume d\'Or', color: 0xffcf40, short: true },
    s2: { type: 'counter', name: 'Contre du Sage', color: 0xffcf40 },
    sup: { type: 'beam', name: 'Mains de Bronze', color: 0xffb020 },
  },
  {
    id: 'akissi', name: 'Akissi la Panthère', title: 'Jambes de feu',
    color: 0xc8962a, stats: { speed: 5, power: 3, defense: 2 },
    s1: { type: 'uppercut', name: 'Ciseau de la Panthère', color: 0xffd36b },
    s2: { type: 'spin', name: 'Roue acrobatique', color: 0xffd36b },
    sup: { type: 'rush', name: 'Danse de la Panthère', color: 0xffc040 },
  },
  {
    id: 'kanga', name: 'Kanga le Colosse', title: 'La force des ancêtres',
    color: 0xb3261e, stats: { speed: 2, power: 5, defense: 4 },
    s1: { type: 'heavy', name: 'Fendoir', color: 0xff5a3c },
    s2: { type: 'grab', name: 'Saisie du Buffle', color: 0xff5a3c },
    sup: { type: 'rush', name: 'Fureur Ancestrale', color: 0xff3a1e },
  },
  {
    id: 'k225', name: 'Unité K-225', title: 'Ninja cybernétique',
    color: 0xe0142c, stats: { speed: 4, power: 3, defense: 3 },
    s1: { type: 'dash', name: 'Lame laser', color: 0xff2040 },
    s2: { type: 'teleport', name: 'Téléportation', color: 0xff2040 },
    sup: { type: 'rush', name: 'Protocole Rouge', color: 0xff1030 },
  },
  {
    id: 'aya', name: 'Aya Spark', title: 'Pilote plasma',
    color: 0x2a9dff, stats: { speed: 4, power: 3, defense: 3 },
    s1: { type: 'projectile', name: 'Tir plasma', color: 0x4fd2ff },
    s2: { type: 'shield', name: 'Bouclier bleu', color: 0x4fd2ff },
    sup: { type: 'beam', name: 'Surcharge', color: 0x4fd2ff },
  },
  {
    id: 'kid', name: 'Kid Treichville', title: 'Le cogneur',
    color: 0xd81f26, stats: { speed: 3, power: 5, defense: 3 },
    s1: { type: 'uppercut', name: 'Uppercut de Treichville', color: 0xffe066 },
    s2: { type: 'dash', name: 'Crochet Bulldozer', color: 0xff8a3c },
    sup: { type: 'rush', name: 'K.-O. Express', color: 0xffd020 },
  },
  {
    id: 'archer', name: 'L\'Archer du Banco', title: 'L\'œil de la forêt',
    color: 0x3fae3a, stats: { speed: 4, power: 2, defense: 2 },
    s1: { type: 'projectile', name: 'Flèche émeraude', color: 0x7dff6a, arrow: true },
    s2: { type: 'rain', name: 'Pluie de flèches', color: 0x7dff6a },
    sup: { type: 'storm', name: 'Esprit de la Forêt', color: 0x7dff6a },
  },
];

export const fighterById = (id) => FIGHTERS.find((f) => f.id === id);

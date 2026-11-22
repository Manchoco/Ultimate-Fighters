// Casting validé (fiche « Ultimate Fighters — Fiche des combattants et des arènes »).
// Stats de 1 à 5 : speed (vitesse), power (puissance), defense (défense).
// Chaque coup (s1, s2, sup) pointe vers sa mécanique unique dans systems/Moves.js (champ id).

export const FIGHTERS = [
  {
    id: 'manchoco', name: 'Manchoco', title: 'Le héros d\'Abidjan',
    color: 0x2f7bff, stats: { speed: 4, power: 4, defense: 3 },
    s1: { id: 'voltArc', name: 'Poing Volt', desc: 'Arc électrique à distance, électrocute', color: 0x8fd0ff },
    s2: { id: 'voltRush', name: 'Ruée électrique', desc: 'Fonce et traverse l\'adversaire', color: 0x5fb4ff },
    sup: { id: 'stormAbidjan', name: 'Orage sur Abidjan', desc: '7 éclairs tombent du ciel', color: 0x7fc8ff },
  },
  {
    id: 'doyen', name: 'Le Doyen', title: 'Maître des paumes',
    color: 0xd9a520, stats: { speed: 3, power: 4, defense: 4 },
    s1: { id: 'goldPalm', name: 'Paume d\'Or', desc: 'Onde dorée qui repousse très loin', color: 0xffcf40 },
    s2: { id: 'sageCounter', name: 'Contre du Sage', desc: 'Pare un coup puis riposte', color: 0xffcf40 },
    sup: { id: 'bronzeHands', name: 'Mains de Bronze', desc: 'Main géante qui traverse l\'écran', color: 0xffb020 },
  },
  {
    id: 'akissi', name: 'Akissi la Panthère', title: 'Jambes de feu',
    color: 0xc8962a, stats: { speed: 5, power: 3, defense: 2 },
    s1: { id: 'pantherScissor', name: 'Ciseau de la Panthère', desc: 'Salto et coup de pied vrillé', color: 0xffd36b },
    s2: { id: 'cartwheel', name: 'Roue acrobatique', desc: 'Roule en avant, touches multiples', color: 0xffd36b },
    sup: { id: 'pantherDance', name: 'Danse de la Panthère', desc: '5 passages, griffures dorées', color: 0xffc040 },
  },
  {
    id: 'kanga', name: 'Kanga le Colosse', title: 'La force des ancêtres',
    color: 0xb3261e, stats: { speed: 2, power: 5, defense: 4 },
    s1: { id: 'axeCleave', name: 'Fendoir', desc: 'Fend le sol : fissure à parer accroupi', color: 0xff5a3c },
    s2: { id: 'buffaloThrow', name: 'Saisie du Buffle', desc: 'Attrape et projette derrière lui', color: 0xff5a3c },
    sup: { id: 'ancestralFury', name: 'Fureur Ancestrale', desc: 'Bond et séisme (sauter pour l\'éviter)', color: 0xff3a1e },
  },
  {
    id: 'k225', name: 'Unité K-225', title: 'Ninja cybernétique',
    color: 0xe0142c, stats: { speed: 4, power: 3, defense: 3 },
    s1: { id: 'laserSlash', name: 'Lame laser', desc: 'Grand arc laser devant lui', color: 0xff2040 },
    s2: { id: 'teleport', name: 'Téléportation', desc: 'Réapparaît dans le dos et frappe', color: 0xff2040 },
    sup: { id: 'redProtocol', name: 'Protocole Rouge', desc: 'Verrouille la cible, 5 tirs laser', color: 0xff1030 },
  },
  {
    id: 'aya', name: 'Aya Spark', title: 'Pilote plasma',
    color: 0x2a9dff, stats: { speed: 4, power: 3, defense: 3 },
    s1: { id: 'plasmaOrb', name: 'Tir plasma', desc: 'Orbe lente qui explose à l\'impact', color: 0x4fd2ff },
    s2: { id: 'blueShield', name: 'Bouclier bleu', desc: 'Renvoie les projectiles adverses', color: 0x4fd2ff },
    sup: { id: 'overcharge', name: 'Surcharge', desc: 'Rayon plasma continu', color: 0x4fd2ff },
  },
  {
    id: 'kid', name: 'Kid Treichville', title: 'Le cogneur',
    color: 0xd81f26, stats: { speed: 3, power: 5, defense: 3 },
    s1: { id: 'treichUppercut', name: 'Uppercut de Treichville', desc: 'Uppercut enflammé, envoie en l\'air', color: 0xffa020 },
    s2: { id: 'armoredHook', name: 'Crochet Bulldozer', desc: 'Encaisse un coup sans broncher, puis frappe', color: 0xff8a3c },
    sup: { id: 'koExpress', name: 'K.-O. Express', desc: 'Rafale de coups, K.O. au ralenti', color: 0xffd020 },
  },
  {
    id: 'archer', name: 'L\'Archer du Banco', title: 'L\'œil de la forêt',
    color: 0x3fae3a, stats: { speed: 4, power: 2, defense: 2 },
    s1: { id: 'emeraldArrow', name: 'Flèche émeraude', desc: 'Flèche perçante très rapide', color: 0x7dff6a },
    s2: { id: 'arrowRain', name: 'Pluie de flèches', desc: 'Flèches en cloche sur l\'adversaire', color: 0x7dff6a },
    sup: { id: 'forestSpirit', name: 'Esprit de la Forêt', desc: 'Racines qui immobilisent, flèche géante', color: 0x7dff6a },
  },
];

export const fighterById = (id) => FIGHTERS.find((f) => f.id === id);

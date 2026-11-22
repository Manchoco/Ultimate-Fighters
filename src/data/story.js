// Mode Histoire : prologue commun, puis une introduction et une fin propres à chaque combattant.
// Chaque texte est une liste de « cartes » affichées l'une après l'autre.

export const PROLOGUE = [
  'Une nuit sans lune, les tambours de la Forêt des Masques se sont mis à battre tout seuls.',
  'Kôrô, le Masque Souverain, s\'est réveillé après cent ans de sommeil. Il cherche un corps digne de le porter.',
  'Il a lancé un défi aux légendes de Côte d\'Ivoire : seul le plus fort pourra le regarder en face.',
];

export const BOSS_TAUNT = 'Je suis Kôrô. J\'ai vu naître tes ancêtres. Montre-moi si ta force mérite mon masque.';

export const STORY = {
  manchoco: {
    intro: [
      'Abidjan s\'est réveillée sous un ciel d\'orage. Manchoco sent l\'électricité courir dans ses poings.',
      '« Si un masque veut défier la ville, il devra d\'abord passer par moi. »',
    ],
    ending: [
      'Le masque se fend en deux sous le dernier éclair. Le silence retombe sur la forêt.',
      'Manchoco rentre à Abidjan à l\'aube. Sur le pont, les gens l\'acclament : le héros de la ville a tenu parole.',
    ],
  },
  doyen: {
    intro: [
      'Le Doyen connaît le nom de Kôrô. Son propre maître l\'avait scellé, il y a très longtemps.',
      '« Ce que mon maître a commencé, je dois le finir. Mes paumes se souviennent. »',
    ],
    ending: [
      'D\'une dernière paume dorée, le Doyen referme le sceau que son maître avait tracé.',
      'Il dépose le masque endormi au pied de la basilique. « Repose, vieil ami. Cette fois, pour de bon. »',
    ],
  },
  akissi: {
    intro: [
      'Akissi a entendu les tambours depuis les toits de Grand-Bassam. La panthère n\'aime pas qu\'on la réveille.',
      '« Un masque qui veut un corps ? Il faudra d\'abord l\'attraper. »',
    ],
    ending: [
      'Trop vive pour le masque, Akissi le désarme d\'un dernier ciseau et l\'envoie rouler dans les fougères.',
      'Elle disparaît dans la nuit avant que quiconque puisse la remercier. On raconte qu\'elle veille encore.',
    ],
  },
  kanga: {
    intro: [
      'Kanga le Colosse a senti la terre trembler sous ses pieds. Ses ancêtres l\'appellent à la forêt.',
      '« Un masque contre ma hache ? Qu\'il vienne. Le buffle ne recule jamais. »',
    ],
    ending: [
      'La hache de Kanga fend la terre. Kôrô s\'agenouille devant une force qu\'il n\'avait plus vue depuis cent ans.',
      'Le masque se pose de lui-même sur l\'autel des ancêtres. Kanga repart sans un mot, la tête haute.',
    ],
  },
  k225: {
    intro: [
      'Mission reçue : anomalie énergétique dans la Forêt des Masques. Niveau de menace : maximal.',
      '« Cible identifiée : Kôrô. Protocole d\'élimination activé. »',
    ],
    ending: [
      'Les lasers de K-225 dispersent l\'esprit du masque en mille éclats dorés. Anomalie neutralisée.',
      'Dans sa mémoire, une donnée nouvelle apparaît : « Courage ». K-225 l\'enregistre. Il ne sait pas encore pourquoi.',
    ],
  },
  aya: {
    intro: [
      'Les capteurs d\'Aya Spark s\'affolent : la forêt émet une énergie jamais mesurée.',
      '« Une source d\'énergie vivante ? Je dois la comprendre avant qu\'elle ne détruise tout. »',
    ],
    ending: [
      'Le plasma d\'Aya absorbe la force du masque et la stabilise dans une sphère bleue.',
      'De retour à son laboratoire, elle la garde à l\'abri. Cette énergie pourrait éclairer tout le pays.',
    ],
  },
  kid: {
    intro: [
      'Kid Treichville s\'entraînait au club quand les tambours ont couvert la musique du quartier.',
      '« Un nouveau challenger ? Montez sur le ring, monsieur le masque ! »',
    ],
    ending: [
      'Un dernier uppercut et Kôrô s\'envole au-dessus des arbres. K.-O. !',
      'À Treichville, on fête le champion jusqu\'au matin. Kid accroche le masque fendu au mur du club.',
    ],
  },
  archer: {
    intro: [
      'La forêt du Banco murmure à l\'Archer : quelque chose d\'ancien et de dangereux s\'est réveillé.',
      '« La forêt m\'a confié ses arbres. Je ne laisserai personne les abîmer. »',
    ],
    ending: [
      'La flèche géante de l\'Archer traverse le masque. Les racines l\'emportent sous la terre.',
      'La forêt reprend son souffle. Les oiseaux chantent à nouveau, et l\'Archer redevient invisible parmi les arbres.',
    ],
  },
  ahou: {
    intro: [
      'Ahou la Nuit a toujours su que Kôrô reviendrait. Elle connaît la magie du masque mieux que quiconque.',
      '« Ce masque m\'a pris quelqu\'un, autrefois. Cette nuit, c\'est moi qui viens le chercher. »',
    ],
    ending: [
      'Les flammes violettes d\'Ahou enveloppent le masque. Sa magie s\'éteint enfin.',
      'Elle garde le masque endormi contre elle et s\'en va dans la nuit. Personne ne sait ce qu\'elle compte en faire…',
    ],
  },
};

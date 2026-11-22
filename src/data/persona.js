// Personnalité de chaque combattant : façon de se tenir, de marcher, de provoquer,
// de célébrer la victoire, et type de prise (corps à corps).
//   stance : vitesse du balancement de garde (Hz) et amplitude du rebond (px)
//   walk   : cadence de marche (pas / s)            style : 'bounce' | 'prowl' | 'heavy' | 'robot' | 'float' | 'calm'
//   taunt  : phrase de la mimique (provocation)     quote : réplique de victoire
//   cheer  : enchaînement de poses de célébration [pose, durée ms] + effet (voir Fighter.celebrate)
//   grab   : 'throw' (projection) | 'takedown' (amenée au sol + frappes au sol) | 'slam' (soulevé puis écrasé)
// Lu par : systems/Fighter.js (pose, rendu, prises, célébration) et systems/AI.js (mimiques).

export const PERSONA = {
  manchoco: {
    style: 'bounce', stance: { hz: 2.2, amp: 5 }, walk: 7,
    taunt: 'Viens voir !', quote: 'Abidjan est en sécurité !',
    cheer: { seq: [['cheer0', 500], ['taunt0', 400], ['cheer1', 900]], fx: 'lightning' },
    grab: { type: 'takedown', name: 'Amenée électrique' },
  },
  doyen: {
    style: 'calm', stance: { hz: 0.9, amp: 1.5 }, walk: 5,
    taunt: 'Tu es encore jeune…', quote: 'La patience est la plus forte des paumes.',
    cheer: { seq: [['cheer2', 500], ['cheer0', 1400]], fx: 'goldAura' },
    grab: { type: 'throw', name: 'Redirection du Doyen' },
  },
  akissi: {
    style: 'prowl', stance: { hz: 1.6, amp: 3 }, walk: 8,
    taunt: 'Attrape-moi si tu peux.', quote: 'Trop lent pour la panthère.',
    cheer: { seq: [['jump', 650], ['stance0', 300], ['taunt0', 900]], fx: 'backflip' },
    grab: { type: 'takedown', name: 'Ciseaux de la panthère' },
  },
  kanga: {
    style: 'heavy', stance: { hz: 1.1, amp: 2.5 }, walk: 4.5,
    taunt: 'HAAA !', quote: 'Le buffle ne recule jamais.',
    cheer: { seq: [['taunt1', 600], ['cheer0', 500], ['cheer1', 900]], fx: 'roar' },
    grab: { type: 'slam', name: 'Écrasement du buffle' },
  },
  k225: {
    style: 'robot', stance: { hz: 1.0, amp: 0 }, walk: 5,
    taunt: 'Cible analysée.', quote: 'Mission accomplie.',
    cheer: { seq: [['taunt0', 400], ['taunt1', 400], ['cheer0', 1200]], fx: 'glitch' },
    grab: { type: 'throw', name: 'Projection mécanique' },
  },
  aya: {
    style: 'float', stance: { hz: 1.4, amp: 3 }, walk: 6,
    taunt: 'Expérience intéressante…', quote: 'Résultat conforme à mes calculs.',
    cheer: { seq: [['taunt0', 500], ['taunt1', 300], ['cheer1', 1000]], fx: 'sparks' },
    grab: { type: 'throw', name: 'Décharge plasma' },
  },
  kid: {
    style: 'bounce', stance: { hz: 2.8, amp: 7 }, walk: 8,
    taunt: 'Allez, approche !', quote: 'Treichville, champion du monde !',
    cheer: { seq: [['cheer0', 280], ['cheer1', 280], ['cheer0', 280], ['cheer1', 280], ['cheer2', 900]], fx: 'jumps' },
    grab: { type: 'slam', name: 'Corps à corps du ring' },
  },
  archer: {
    style: 'calm', stance: { hz: 1.2, amp: 1.5 }, walk: 6,
    taunt: 'La forêt te regarde.', quote: 'Ma flèche ne manque jamais.',
    cheer: { seq: [['cheer0', 500], ['cheer1', 1300]], fx: 'skyArrow' },
    grab: { type: 'takedown', name: 'Piège du chasseur' },
  },
  ahou: {
    style: 'float', stance: { hz: 1.0, amp: 6 }, walk: 4,
    taunt: 'La nuit t\'attend…', quote: 'Les ténèbres ont gagné.',
    cheer: { seq: [['cheer0', 600], ['cheer1', 1200]], fx: 'flames' },
    grab: { type: 'throw', name: 'Étreinte de minuit' },
  },
  koro: {
    style: 'heavy', stance: { hz: 0.8, amp: 3 }, walk: 4,
    taunt: 'Agenouille-toi.', quote: 'Ton corps sera mon masque.',
    cheer: { seq: [['cheer0', 400], ['cheer1', 400], ['cheer2', 400], ['cheer1', 900]], fx: 'maskDance' },
    grab: { type: 'slam', name: 'Jugement des ancêtres' },
  },
};

export const personaOf = (id) => PERSONA[id] || PERSONA.manchoco;

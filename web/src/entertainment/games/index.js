import React from 'react';

/* Har game ka code alag chunk mein hai — hub khulne par sirf metadata load
   hota hai, game component tab load hota hai jab user khelna shuru karta hai. */
export const GAMES = [
  {
    id: 'snake',
    name: 'Snake',
    emoji: '🐍',
    category: 'Arcade',
    tagline: 'Classic snake — khud se aur deewar se bachein.',
    desc: 'Arrow keys, WASD ya swipe se snake chalaayein. Har food par score barhta hai aur speed thori tez hoti hai.',
    difficulty: 'Easy to hard',
    controls: 'Keyboard + swipe + D-pad',
    unit: 'food',
    scoreLabel: 'Best food',
    lowerIsBetter: false,
    component: React.lazy(() => import('./Snake.jsx')),
    instructions: [
      'Arrow keys ya WASD se direction badlein; mobile par swipe ya D-pad use karein.',
      'Har food khaane par score +1 hota hai. Har 4 food par speed barhti hai.',
      'Deewar ya apne jism se takrana game over hai. Space se pause karein.',
    ],
  },
  {
    id: '2048',
    name: '2048',
    emoji: '🔢',
    category: 'Puzzle',
    tagline: 'Milte julte numbers ko merge karke 2048 banayein.',
    desc: 'Arrow keys / WASD ya swipe se tiles slide karein. Do same numbers merge hokar double ho jate hain.',
    difficulty: 'Medium',
    controls: 'Keyboard + swipe',
    unit: 'points',
    scoreLabel: 'Best score',
    lowerIsBetter: false,
    component: React.lazy(() => import('./Game2048.jsx')),
    instructions: [
      'Arrow keys, WASD ya board par swipe karein.',
      'Do same value ke tiles merge hokar double ho jate hain.',
      '2048 banane ke baad bhi khel sakte hain. Jab koi move na bache to game over.',
    ],
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    emoji: '⭕',
    category: 'Strategy',
    tagline: 'Computer ke khilaf 3×3 ka classic muqabla.',
    desc: 'Aap X hain, computer O. Teen square ki line banayein — lekin computer ko rokna hoga.',
    difficulty: 'Easy / Normal / Hard',
    controls: 'Mouse + touch + keyboard',
    unit: 'wins',
    scoreLabel: 'Best result',
    lowerIsBetter: false,
    component: React.lazy(() => import('./TicTacToe.jsx')),
    instructions: [
      'Apni baari par khaali square par click / tap karein.',
      'Teen X ek line mein (horizontal, vertical ya diagonal) banayein.',
      'Hard mode mein computer perfect khelta hai — draw sab se behtar result hai.',
    ],
  },
  {
    id: 'memory',
    name: 'Memory Match',
    emoji: '🧩',
    category: 'Puzzle',
    tagline: '8 jodiyan yaad karein, kam moves mein clear karein.',
    desc: 'Cards palat kar jodi banayein. Kam moves aur kam waqt behtar score hai.',
    difficulty: 'Easy',
    controls: 'Mouse + touch',
    unit: 'moves',
    scoreLabel: 'Best (kam moves)',
    lowerIsBetter: true,
    component: React.lazy(() => import('./MemoryMatch.jsx')),
    instructions: [
      'Do cards khol kar dekhein ke unke symbols match karte hain ya nahi.',
      'Match na hone par cards wapas band ho jate hain.',
      'Saari 8 jodiyan milane par board clear. Kam moves = behtar personal best.',
    ],
  },
  {
    id: 'reaction',
    name: 'Reaction Test',
    emoji: '🫸',
    category: 'Reflex',
    tagline: 'Green signal par kitni jaldi click karte hain?',
    desc: '5 rounds ka reaction test. Average milliseconds mein result, kam behtar.',
    difficulty: 'Quick',
    controls: 'Mouse + touch + Space',
    unit: 'ms',
    scoreLabel: 'Best average (kam ms)',
    lowerIsBetter: true,
    component: React.lazy(() => import('./ReactionTest.jsx')),
    instructions: [
      'Round shuru karein aur red stage par intezar karein.',
      'Jab stage green ho jaye, foran click / tap / Space dabayein.',
      '5 rounds ka average aapka score hai. Jaldi click round cancel kar deta hai.',
    ],
  },
  {
    id: 'flappy',
    name: 'Sky Run',
    emoji: '🪽',
    category: 'Arcade',
    tagline: 'Pipes ke beech se guzarne wala original flappy-style game.',
    desc: 'Click / tap / Space se bird ko upar udayein aur pipes se bachein. Har pipe par +1.',
    difficulty: 'Medium',
    controls: 'Mouse + touch + Space',
    unit: 'pipes',
    scoreLabel: 'Best pipes',
    lowerIsBetter: false,
    component: React.lazy(() => import('./Flappy.jsx')),
    instructions: [
      'Click, tap ya Space se bird ko flap dein.',
      'Pipes ke beech ke gap se guzrein; har pipe par score +1.',
      'Ground ya pipe se takrane par game over. P ya pause button se ruk sakte hain.',
    ],
  },
];

export const GAME_MAP = GAMES.reduce((acc, g) => {
  acc[g.id] = g;
  return acc;
}, {});

export function getGame(id) {
  return GAME_MAP[id] || null;
}

export function bestLabel(game, best) {
  if (!game) return '—';
  if (!best) return '—';
  if (game.id === 'tic-tac-toe') return 'Win';
  if (game.id === 'memory') return `${best} moves`;
  if (game.id === 'reaction') return `${best} ms`;
  return `${best} ${game.unit}`;
}

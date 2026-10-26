/* ============================================================================
   Entertainment Zone — local progress store
   ----------------------------------------------------------------------------
   Sab kuch sirf is device ke localStorage mein rehta hai. Koi account sync
   nahi, koi global leaderboard nahi. Values user ke browser se aati hain, is
   liye inhein competitive/verified score ke tor par use nahi kiya jata.
   ========================================================================== */

import React from 'react';

export const ENT_EVENT = 'ttg:ent-updated';
const KEY = 'ttg.ent.v1';
const DAILY_XP_CAP = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const int = (v, fallback = 0) => Math.max(0, Math.round(num(v, fallback)));
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function defaults() {
  return {
    version: 1,
    xp: 0,
    xpDay: { date: '', earned: 0 },
    visits: 0,
    streak: 0,
    bestStreak: 0,
    lastVisit: null,
    plays: 0,
    games: {},
    bests: {},
    counters: {
      tttWins: 0,
      memClears: 0,
      quizzes: 0,
      quizPerfect: 0,
      quizAnswered: 0,
      quizCorrect: 0,
      memes: 0,
      chill: 0,
      tests: 0,
      tile2048: 0,
      dailies: 0,
    },
    quizBest: {},
    daily: {},
    recent: [],
    achievements: {},
    choices: {},
  };
}

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const probe = '__ttg_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/* -------------------------------- dates --------------------------------- */

export function localDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function validDateKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ------------------------------- loading -------------------------------- */

function sanitizeMap(input, numeric = true) {
  const out = {};
  if (!isObj(input)) return out;
  Object.keys(input).slice(0, 200).forEach((k) => {
    if (typeof k !== 'string' || k.length > 80) return;
    const v = input[k];
    if (numeric) {
      if (Number.isFinite(v)) out[k] = Math.max(0, v);
    } else if (typeof v === 'string') {
      out[k] = v;
    }
  });
  return out;
}

export function loadStats() {
  const base = defaults();
  const ls = safeStorage();
  if (!ls) return base;
  let raw = null;
  try {
    raw = JSON.parse(ls.getItem(KEY) || 'null');
  } catch {
    raw = null;
  }
  if (!isObj(raw)) return base;

  base.xp = int(raw.xp);
  const xpDay = isObj(raw.xpDay) ? raw.xpDay : {};
  base.xpDay = {
    date: validDateKey(xpDay.date) ? xpDay.date : '',
    earned: int(xpDay.earned),
  };
  base.visits = int(raw.visits);
  base.streak = int(raw.streak);
  base.bestStreak = Math.max(base.streak, int(raw.bestStreak));
  base.lastVisit = validDateKey(raw.lastVisit) ? raw.lastVisit : null;
  base.plays = int(raw.plays);
  base.games = sanitizeMap(raw.games);
  base.bests = sanitizeMap(raw.bests);
  base.counters = { ...base.counters, ...sanitizeMap(raw.counters) };
  base.quizBest = sanitizeMap(raw.quizBest);
  base.daily = {};
  if (isObj(raw.daily)) {
    Object.keys(raw.daily).slice(-120).forEach((k) => {
      if (validDateKey(k) && typeof raw.daily[k] === 'string' && raw.daily[k].length < 60) {
        base.daily[k] = raw.daily[k];
      }
    });
  }
  base.achievements = sanitizeMap(raw.achievements, false);
  base.choices = {};
  if (isObj(raw.choices)) {
    Object.keys(raw.choices).slice(0, 100).forEach((k) => {
      const v = raw.choices[k];
      if (Array.isArray(v)) {
        base.choices[k] = v.slice(0, 8).map((n) => int(n));
      }
    });
  }
  base.recent = Array.isArray(raw.recent)
    ? raw.recent
        .filter((r) => isObj(r) && typeof r.id === 'string' && Number.isFinite(r.at))
        .slice(0, 8)
        .map((r) => ({ id: r.id.slice(0, 60), at: r.at }))
    : [];
  return base;
}

function emit(detail) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(ENT_EVENT, { detail }));
  } catch {
    /* ignore */
  }
}

function pruneDaily(stats) {
  const keys = Object.keys(stats.daily);
  if (keys.length <= 90) return;
  keys.sort();
  keys.slice(0, keys.length - 90).forEach((k) => {
    delete stats.daily[k];
  });
}

function syncAchievements(stats) {
  ACHIEVEMENTS.forEach((a) => {
    if (stats.achievements[a.id]) return;
    if (achievementState(a, stats).unlocked) {
      stats.achievements[a.id] = new Date().toISOString();
    }
  });
}

export function saveStats(stats) {
  if (!isObj(stats)) return stats;
  syncAchievements(stats);
  pruneDaily(stats);
  const ls = safeStorage();
  if (ls) {
    try {
      ls.setItem(KEY, JSON.stringify(stats));
    } catch {
      /* storage full / blocked — keep in-memory only */
    }
  }
  emit({ reason: 'save' });
  return stats;
}

function mutate(fn) {
  const stats = loadStats();
  const result = fn(stats);
  saveStats(stats);
  return { stats, result };
}

/* --------------------------------- XP ----------------------------------- */

export function levelInfo(xp) {
  const total = Math.max(0, Math.round(num(xp)));
  let level = 1;
  let remaining = total;
  let need = 100;
  while (remaining >= need && level < 999) {
    remaining -= need;
    level += 1;
    need = 100 + (level - 1) * 50;
  }
  return {
    level,
    into: remaining,
    need,
    total,
    percent: need > 0 ? clamp((remaining / need) * 100, 0, 100) : 0,
  };
}

export function xpToday(stats) {
  if (!stats || stats.xpDay.date !== localDateKey()) return 0;
  return int(stats.xpDay.earned);
}

function applyXp(stats, amount) {
  const gainWanted = Math.max(0, Math.round(num(amount)));
  if (!gainWanted) return 0;
  const today = localDateKey();
  if (stats.xpDay.date !== today) stats.xpDay = { date: today, earned: 0 };
  const remaining = Math.max(0, DAILY_XP_CAP - int(stats.xpDay.earned));
  const gain = Math.min(gainWanted, remaining);
  stats.xp = int(stats.xp) + gain;
  stats.xpDay.earned = int(stats.xpDay.earned) + gain;
  return gain;
}

/* ----------------------------- achievements ------------------------------ */

function distinctGames(stats) {
  return Object.keys(stats.games || {}).filter((k) => num(stats.games[k]) > 0).length;
}

export const ACHIEVEMENTS = [
  {
    id: 'first-play',
    emoji: '🎮',
    title: 'Pehla Qadam',
    desc: 'Ek mini game mukammal karein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.plays,
    unit: 'games',
  },
  {
    id: 'arcade-explorer',
    emoji: '🧭',
    title: 'Arcade Explorer',
    desc: '4 mukhtalif games khelain.',
    target: 4,
    mode: 'gte',
    value: (s) => distinctGames(s),
    unit: 'games',
  },
  {
    id: 'arcade-master',
    emoji: '🏆',
    title: 'Arcade Master',
    desc: 'Saare 6 games try karein.',
    target: 6,
    mode: 'gte',
    value: (s) => distinctGames(s),
    unit: 'games',
  },
  {
    id: 'snake-50',
    emoji: '🐍',
    title: 'Snake Charmer',
    desc: 'Snake mein 50 food khaein (personal best).',
    target: 50,
    mode: 'gte',
    value: (s) => s.bests.snake,
    unit: 'food',
  },
  {
    id: 'snake-150',
    emoji: '👑',
    title: 'Snake Legend',
    desc: 'Snake mein 150 food — personal best.',
    target: 150,
    mode: 'gte',
    value: (s) => s.bests.snake,
    unit: 'food',
  },
  {
    id: 'tile-2048',
    emoji: '🔢',
    title: '2048 Club',
    desc: '2048 board par 2048 tile banayein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.tile2048,
    unit: 'unlock',
  },
  {
    id: 'memory-clear',
    emoji: '🧩',
    title: 'Memory Clear',
    desc: 'Memory Match ka ek board mukammal karein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.memClears,
    unit: 'boards',
  },
  {
    id: 'memory-sharp',
    emoji: '⚡',
    title: 'Sharp Memory',
    desc: 'Memory Match 12 ya kam moves mein jeetein.',
    target: 12,
    mode: 'lte',
    value: (s) => s.bests.memory,
    unit: 'moves',
  },
  {
    id: 'reflex-250',
    emoji: '🫸',
    title: 'Quick Reflex',
    desc: 'Reaction Test ka average 250ms ya kam ho.',
    target: 250,
    mode: 'lte',
    value: (s) => s.bests.reaction,
    unit: 'ms',
  },
  {
    id: 'reflex-180',
    emoji: '⚡',
    title: 'Lightning Reflex',
    desc: 'Reaction Test average 180ms ya kam.',
    target: 180,
    mode: 'lte',
    value: (s) => s.bests.reaction,
    unit: 'ms',
  },
  {
    id: 'flappy-10',
    emoji: '🪽',
    title: 'Sky Runner',
    desc: 'Flappy-style game mein 10 pipes cross karein.',
    target: 10,
    mode: 'gte',
    value: (s) => s.bests.flappy,
    unit: 'pipes',
  },
  {
    id: 'ttt-win',
    emoji: '❌',
    title: 'Computer Ko Harao',
    desc: 'Tic-Tac-Toe mein computer ke khilaf ek round jeetein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.tttWins,
    unit: 'wins',
  },
  {
    id: 'quiz-rookie',
    emoji: '📚',
    title: 'Quiz Rookie',
    desc: 'Ek quiz round mukammal karein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.quizzes,
    unit: 'rounds',
  },
  {
    id: 'quiz-perfect',
    emoji: '💯',
    title: 'Perfect Round',
    desc: 'Kisi quiz mein saare jawab sahi dein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.quizPerfect,
    unit: 'perfect',
  },
  {
    id: 'quiz-veteran',
    emoji: '🎓',
    title: 'Quiz Veteran',
    desc: '10 quiz rounds mukammal karein.',
    target: 10,
    mode: 'gte',
    value: (s) => s.counters.quizzes,
    unit: 'rounds',
  },
  {
    id: 'meme-maker',
    emoji: '🖼️',
    title: 'Meme Maker',
    desc: 'Meme Lab se ek meme download karein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.memes,
    unit: 'memes',
  },
  {
    id: 'chill-seeker',
    emoji: '🎧',
    title: 'Chill Seeker',
    desc: 'Chill Zone mein ambient sound chalayein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.chill,
    unit: 'sessions',
  },
  {
    id: 'tester',
    emoji: '🧠',
    title: 'Curious Mind',
    desc: 'Ek fun ya personality test mukammal karein.',
    target: 1,
    mode: 'gte',
    value: (s) => s.counters.tests,
    unit: 'tests',
  },
  {
    id: 'streak-3',
    emoji: '🔥',
    title: '3-Din Streak',
    desc: 'Teen din lagatar Entertainment Zone visit karein.',
    target: 3,
    mode: 'gte',
    value: (s) => s.bestStreak,
    unit: 'days',
  },
  {
    id: 'streak-7',
    emoji: '🗓️',
    title: '7-Din Streak',
    desc: 'Saat din lagatar wapas aayein.',
    target: 7,
    mode: 'gte',
    value: (s) => s.bestStreak,
    unit: 'days',
  },
  {
    id: 'daily-5',
    emoji: '✅',
    title: 'Daily Regular',
    desc: '5 daily challenges mukammal karein.',
    target: 5,
    mode: 'gte',
    value: (s) => s.counters.dailies,
    unit: 'days',
  },
  {
    id: 'level-5',
    emoji: '⭐',
    title: 'Level 5',
    desc: 'Entertainment XP se Level 5 tak pohanchein.',
    target: 5,
    mode: 'gte',
    value: (s) => levelInfo(s.xp).level,
    unit: 'level',
  },
  {
    id: 'xp-1000',
    emoji: '💎',
    title: 'XP Collector',
    desc: '1000 Entertainment XP jama karein.',
    target: 1000,
    mode: 'gte',
    value: (s) => s.xp,
    unit: 'XP',
  },
];

export function achievementState(a, stats) {
  const raw = Number(a.value(stats));
  const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  let unlocked;
  let percent;
  if (a.mode === 'lte') {
    unlocked = value > 0 && value <= a.target;
    percent = value > 0 ? clamp(Math.round((a.target / value) * 100), 0, 100) : 0;
  } else {
    unlocked = value >= a.target;
    percent = a.target > 0 ? clamp(Math.round((value / a.target) * 100), 0, 100) : 0;
  }
  return { unlocked, percent, value };
}

export function unlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((a) => achievementState(a, stats).unlocked);
}

/* ----------------------------- daily challenge --------------------------- */

export const DAILY_CHALLENGES = [
  {
    id: 'play-game',
    type: 'game',
    target: 1,
    title: 'Arcade Break',
    desc: 'Aaj koi bhi ek mini game mukammal karein.',
    cta: '/entertainment/games',
    ctaLabel: 'Games kholein',
    xp: 25,
  },
  {
    id: 'quiz-round',
    type: 'quiz',
    target: 1,
    title: 'Quiz Time',
    desc: 'Aaj ek quiz round (10 sawal) mukammal karein.',
    cta: '/entertainment/quizzes',
    ctaLabel: 'Quiz shuru karein',
    xp: 25,
  },
  {
    id: 'meme-one',
    type: 'meme',
    target: 1,
    title: 'Meme Break',
    desc: 'Meme Lab se aaj ek meme download karein.',
    cta: '/entertainment/memes',
    ctaLabel: 'Meme banayein',
    xp: 25,
  },
  {
    id: 'chill-sound',
    type: 'chill',
    target: 1,
    title: 'Thora Chill',
    desc: 'Aaj Chill Zone mein koi ambient sound chalayein.',
    cta: '/entertainment/chill',
    ctaLabel: 'Chill Zone',
    xp: 25,
  },
  {
    id: 'reaction-run',
    type: 'reaction',
    target: 1,
    title: 'Reflex Check',
    desc: 'Aaj Reaction Test ke 5 rounds mukammal karein.',
    cta: '/entertainment/games/reaction',
    ctaLabel: 'Reaction Test',
    xp: 25,
  },
  {
    id: 'snake-10',
    type: 'snake',
    target: 10,
    title: 'Snake Snack',
    desc: 'Aaj Snake mein 10 food khaein (ek hi run mein).',
    cta: '/entertainment/games/snake',
    ctaLabel: 'Snake khelein',
    xp: 25,
  },
  {
    id: 'memory-board',
    type: 'memory',
    target: 1,
    title: 'Memory Board',
    desc: 'Aaj Memory Match ka ek board mukammal karein.',
    cta: '/entertainment/games/memory',
    ctaLabel: 'Memory Match',
    xp: 25,
  },
  {
    id: 'fun-test',
    type: 'test',
    target: 1,
    title: 'Fun Test',
    desc: 'Aaj ek fun ya personality test mukammal karein.',
    cta: '/entertainment/fun',
    ctaLabel: 'Fun Tests',
    xp: 25,
  },
  {
    id: 'flappy-5',
    type: 'flappy',
    target: 5,
    title: 'Flappy Five',
    desc: 'Aaj Flappy-style game mein 5 pipes cross karein.',
    cta: '/entertainment/games/flappy',
    ctaLabel: 'Flappy khelein',
    xp: 25,
  },
  {
    id: 'tile-2048',
    type: '2048',
    target: 2048,
    title: '2048 Mission',
    desc: 'Aaj 2048 board par 2048 tile banayein.',
    cta: '/entertainment/games/2048',
    ctaLabel: '2048 khelein',
    xp: 40,
  },
];

export function dailyChallengeFor(dateKey = localDateKey()) {
  const key = validDateKey(dateKey) ? dateKey : localDateKey();
  if (!key) return DAILY_CHALLENGES[0];
  return DAILY_CHALLENGES[hashString(`ttg-ent-${key}`) % DAILY_CHALLENGES.length];
}

export function dailyState(stats = loadStats()) {
  const date = localDateKey();
  const challenge = dailyChallengeFor(date);
  return {
    date,
    challenge,
    done: stats.daily[date] === challenge.id,
  };
}

function completeDaily(stats, events) {
  const state = dailyState(stats);
  if (state.done) return null;
  const list = Array.isArray(events) ? events : [];
  const hit = list.some((e) => e && e.type === state.challenge.type && num(e.value, 1) >= state.challenge.target);
  if (!hit) return null;
  stats.daily[state.date] = state.challenge.id;
  stats.counters.dailies = int(stats.counters.dailies) + 1;
  applyXp(stats, state.challenge.xp);
  return state.challenge;
}

/* ------------------------------ game results ----------------------------- */

export function recordGameResult(gameId, opts = {}) {
  if (typeof gameId !== 'string' || !gameId) return null;
  const lowerIsBetter = !!opts.lowerIsBetter;
  const score = Math.max(0, Math.round(num(opts.score)));

  const { stats, result } = mutate((s) => {
    s.plays = int(s.plays) + 1;
    s.games[gameId] = int(s.games[gameId]) + 1;
    s.recent = [{ id: gameId, at: Date.now() }, ...s.recent.filter((r) => r.id !== gameId)].slice(0, 8);

    let isBest = false;
    if (score > 0) {
      const current = num(s.bests[gameId], 0);
      if (!current || (lowerIsBetter ? score < current : score > current)) {
        s.bests[gameId] = score;
        isBest = true;
      }
    }

    if (isObj(opts.counters)) {
      Object.keys(opts.counters).forEach((k) => {
        if (typeof k === 'string' && Object.prototype.hasOwnProperty.call(s.counters, k)) {
          s.counters[k] = int(s.counters[k]) + int(opts.counters[k]);
        }
      });
    }

    applyXp(s, num(opts.xp, 10));
    const events = [{ type: 'game', value: 1 }, ...(Array.isArray(opts.events) ? opts.events : [])];
    const dailyCompleted = completeDaily(s, events);
    return {
      best: num(s.bests[gameId], 0) || null,
      isBest,
      dailyCompleted,
      xp: int(s.xp),
    };
  });

  return result;
}

/* Standalone milestones (e.g. 2048 tile bana) jo poora game khatam hone par
   depend nahi karte. Plays count nahi barhata. */
export function recordMilestone(opts = {}) {
  const { result } = mutate((s) => {
    if (isObj(opts.counters)) {
      Object.keys(opts.counters).forEach((k) => {
        if (typeof k === 'string' && Object.prototype.hasOwnProperty.call(s.counters, k)) {
          s.counters[k] = int(s.counters[k]) + int(opts.counters[k]);
        }
      });
    }
    applyXp(s, num(opts.xp, 0));
    const dailyCompleted = completeDaily(s, Array.isArray(opts.events) ? opts.events : []);
    return { dailyCompleted };
  });
  return result;
}

/* ------------------------------- activity -------------------------------- */

export function recordActivity(type, opts = {}) {
  if (typeof type !== 'string' || !type) return null;
  const { stats, result } = mutate((s) => {
    if (opts.counter && Object.prototype.hasOwnProperty.call(s.counters, opts.counter)) {
      s.counters[opts.counter] = int(s.counters[opts.counter]) + Math.max(1, int(opts.amount, 1));
    }
    applyXp(s, num(opts.xp, 0));
    const dailyCompleted = completeDaily(s, [{ type, value: num(opts.value, 1) }, ...(Array.isArray(opts.events) ? opts.events : [])]);
    return { dailyCompleted, xp: int(s.xp) };
  });
  return result;
}

export function recordQuiz({ score = 0, total = 0, category = 'mixed', daily = false } = {}) {
  const safeTotal = clamp(int(total), 1, 50);
  const safeScore = clamp(int(score), 0, safeTotal);
  const { stats, result } = mutate((s) => {
    const xpBefore = int(s.xp);
    s.counters.quizzes = int(s.counters.quizzes) + 1;
    s.counters.quizAnswered = int(s.counters.quizAnswered) + safeTotal;
    s.counters.quizCorrect = int(s.counters.quizCorrect) + safeScore;
    if (safeScore === safeTotal && safeTotal > 0) {
      s.counters.quizPerfect = int(s.counters.quizPerfect) + 1;
    }
    const key = String(category || 'mixed').slice(0, 40);
    s.quizBest[key] = Math.max(int(s.quizBest[key]), safeScore);
    applyXp(s, 10 + safeScore * 3);
    const dailyCompleted = completeDaily(s, [{ type: 'quiz', value: 1 }]);
    return {
      best: int(s.quizBest[key]),
      dailyCompleted,
      xpGained: int(s.xp) - xpBefore,
      percent: Math.round((safeScore / safeTotal) * 100),
      isDailyMode: !!daily,
    };
  });
  return result;
}

export function recordChoice(key, optionIndex, optionCount) {
  if (typeof key !== 'string' || !key) return null;
  const count = clamp(int(optionCount, 2), 2, 8);
  const index = clamp(int(optionIndex), 0, count - 1);
  const { stats } = mutate((s) => {
    const current = Array.isArray(s.choices[key]) ? s.choices[key].slice(0, count) : [];
    while (current.length < count) current.push(0);
    current[index] = int(current[index]) + 1;
    s.choices[key] = current;
  });
  return stats.choices[key];
}

/* -------------------------------- streak --------------------------------- */

export function touchVisit() {
  const today = localDateKey();
  const stats = loadStats();
  if (!today || stats.lastVisit === today) {
    return { isNewDay: false, streak: stats.streak, xpGained: 0 };
  }
  const yesterday = localDateKey(new Date(Date.now() - DAY_MS));
  const nextStreak = stats.lastVisit === yesterday ? stats.streak + 1 : 1;
  const { result } = mutate((s) => {
    s.streak = nextStreak;
    s.bestStreak = Math.max(int(s.bestStreak), nextStreak);
    s.lastVisit = today;
    s.visits = int(s.visits) + 1;
    const gained = applyXp(s, 10);
    return { gained };
  });
  return { isNewDay: true, streak: nextStreak, xpGained: result.gained };
}

/* -------------------------------- reset ---------------------------------- */

export function resetProgress() {
  const fresh = defaults();
  saveStats(fresh);
  return fresh;
}

export function bestFor(stats, gameId) {
  const v = num(stats && stats.bests ? stats.bests[gameId] : 0, 0);
  return v || null;
}

/* --------------------------------- hook ---------------------------------- */

export function useEntStats() {
  const [stats, setStats] = React.useState(() => loadStats());
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setStats(loadStats());
    window.addEventListener(ENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(ENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return stats;
}

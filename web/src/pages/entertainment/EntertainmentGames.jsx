import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../../App';
import { EmptyState } from '../../components/ui';
import { EntNav, LocalBadge, PageHeader } from '../../entertainment/shared';
import { GAMES, bestLabel } from '../../entertainment/games';
import { useEntStats } from '../../entertainment/storage';

const FILTERS = ['All', 'Arcade', 'Puzzle', 'Strategy', 'Reflex'];

export default function EntertainmentGames() {
  useMeta(
    'Mini Games Arcade — The Tech Guider Hub',
    'Play Snake, 2048, Tic-Tac-Toe, Memory Match, Reaction Test and Sky Run in your browser. Free, mobile-friendly and no account required.'
  );

  const stats = useEntStats();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((g) => {
      if (filter !== 'All' && g.category !== filter) return false;
      if (!q) return true;
      return `${g.name} ${g.tagline} ${g.desc} ${g.category}`.toLowerCase().includes(q);
    });
  }, [query, filter]);

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />
        <PageHeader
          eyebrow="Arcade"
          title="Mini Games"
          sub="Chhe chote games jo browser mein hi chalte hain — desktop aur mobile dono par. Personal best sirf aapke device par save hota hai."
          right={<LocalBadge>Local bests</LocalBadge>}
        />

        <div className="ent-toolbar">
          <label className="ent-search">
            <span className="sr-only">Games search karein</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Game search karein…"
              aria-label="Games search karein"
            />
          </label>
          <div className="ent-filter-row" role="group" aria-label="Game categories">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`ent-filter${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {games.length === 0 ? (
          <EmptyState
            title="Koi game match nahi hua"
            desc="Search clear karein ya doosri category chunein."
            action={
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuery('');
                  setFilter('All');
                }}
              >
                Filters reset karein
              </button>
            }
          />
        ) : (
          <div className="ent-game-grid ent-game-grid-lg">
            {games.map((g) => (
              <Link key={g.id} to={`/entertainment/games/${g.id}`} className="ent-game-card">
                <div className="ent-game-card-top">
                  <span className="ent-game-emoji" aria-hidden="true">{g.emoji}</span>
                  <span className="ent-tag">{g.category}</span>
                </div>
                <span className="ent-game-name">{g.name}</span>
                <span className="ent-game-desc">{g.desc}</span>
                <span className="ent-game-foot">
                  <span className="ent-tag">{bestLabel(g, stats.bests[g.id])}</span>
                  <span className="ent-game-arrow" aria-hidden="true">→</span>
                </span>
                <span className="ent-game-controls">{g.controls}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="ent-footnote">
          {stats.plays > 0
            ? `Aapne is device par ${stats.plays} game sessions mukammal kiye hain.`
            : 'Abhi koi game session complete nahi hua — pehla game khelein aur apna local best banayein.'}{' '}
          Scores local hain, verified global leaderboard nahi.
        </p>
      </div>
    </div>
  );
}

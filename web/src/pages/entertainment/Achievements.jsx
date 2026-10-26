import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../../App';
import { Icon } from '../../components/ui';
import { EntNav, LocalBadge, PageHeader, ProgressBar, StatPill } from '../../entertainment/shared';
import { GAMES, bestLabel } from '../../entertainment/games';
import {
  ACHIEVEMENTS,
  achievementState,
  dailyState,
  levelInfo,
  resetProgress,
  useEntStats,
  xpToday,
} from '../../entertainment/storage';

const FILTERS = ['All', 'Unlocked', 'Locked'];

export default function Achievements() {
  useMeta(
    'Achievements — Entertainment Zone',
    'Your local Entertainment Zone badges, XP level, personal bests and daily challenge progress. Stored only in this browser.'
  );

  const stats = useEntStats();
  const [filter, setFilter] = useState('All');
  const level = levelInfo(stats.xp);
  const daily = dailyState(stats);
  const answered = stats.counters.quizAnswered || 0;
  const correct = stats.counters.quizCorrect || 0;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
  const unlockedCount = ACHIEVEMENTS.filter((a) => achievementState(a, stats).unlocked).length;

  const list = ACHIEVEMENTS.filter((a) => {
    const isUnlocked = achievementState(a, stats).unlocked;
    if (filter === 'Unlocked') return isUnlocked;
    if (filter === 'Locked') return !isUnlocked;
    return true;
  });

  function handleReset() {
    const ok = window.confirm(
      'Entertainment progress reset karein? XP, badges, best scores, streaks aur local choices sab delete ho jayenge. Ye wapas nahi aayega.'
    );
    if (ok) resetProgress();
  }

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />
        <PageHeader
          eyebrow="Progress"
          title="Achievements"
          sub="Aapke local badges, XP, personal bests aur streak. Ye sab is browser mein save hota hai — account sync nahi hai."
          right={<LocalBadge>Device-local</LocalBadge>}
        />

        <section className="ent-ach-overview">
          <div className="ent-level-card ent-level-large">
            <div className="ent-level-top">
              <div>
                <div className="eyebrow">Entertainment level</div>
                <h2 className="ent-page-title">Level {level.level}</h2>
              </div>
              <span className="ent-level-badge">⭐</span>
            </div>
            <ProgressBar value={level.percent} label="Level progress" tone="accent" />
            <div className="ent-level-meta">
              <span>{level.into} / {level.need} XP</span>
              <span>Total {stats.xp} XP</span>
            </div>
          </div>
          <div className="ent-ach-stats">
            <StatPill label="XP today" value={`+${xpToday(stats)}`} hint="Daily cap 300 XP" />
            <StatPill label="Streak" value={`${stats.streak} din`} hint={`Best ${stats.bestStreak} din`} />
            <StatPill label="Unlocked" value={`${unlockedCount}/${ACHIEVEMENTS.length}`} hint="Badges" />
            <StatPill label="Game sessions" value={stats.plays} hint="Local completions" />
            <StatPill label="Daily challenges" value={stats.counters.dailies || 0} hint="Completed" />
            <StatPill label="Quiz accuracy" value={accuracy === null ? '—' : `${accuracy}%`} hint={answered ? `${correct}/${answered} answers` : 'No rounds yet'} />
          </div>
        </section>

        <section className="ent-daily-inline">
          <div>
            <div className="eyebrow">Aaj ka challenge</div>
            <h2 className="ent-card-title">{daily.challenge.title}</h2>
            <p className="ent-page-sub">{daily.challenge.desc}</p>
          </div>
          <div className="ent-daily-inline-actions">
            <span className="ent-tag">+{daily.challenge.xp} XP</span>
            {daily.done ? (
              <span className="ent-tag">Complete ✓</span>
            ) : (
              <Link to={daily.challenge.cta} className="btn btn-primary btn-sm">{daily.challenge.ctaLabel}</Link>
            )}
          </div>
        </section>

        <section className="ent-section">
          <div className="ent-section-head">
            <div>
              <h2 className="section-title">Badges</h2>
              <p className="section-sub">Har badge ka progress neeche dikhaya gaya hai. Locked badges bhi real goals hain.</p>
            </div>
            <div className="ent-filter-row" role="group" aria-label="Achievement filter">
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

          {list.length === 0 ? (
            <div className="ent-panel">
              <p className="ent-page-sub">Is filter mein koi badge nahi. Filter badal kar dobara dekhein.</p>
            </div>
          ) : (
            <div className="ent-ach-grid">
              {list.map((a) => {
                const state = achievementState(a, stats);
                const unlockedAt = stats.achievements[a.id];
                const progressText =
                  a.mode === 'lte'
                    ? state.value > 0
                      ? `Best: ${state.value} ${a.unit} · target ${a.target} ya kam`
                      : `Abhi koi ${a.unit} score nahi`
                    : `${Math.min(state.value, a.target)} / ${a.target} ${a.unit}`;
                return (
                  <article key={a.id} className={`ent-ach-card${state.unlocked ? ' is-unlocked' : ''}`}>
                    <span className="ent-ach-emoji" aria-hidden="true">{a.emoji}</span>
                    <div className="ent-ach-body">
                      <div className="ent-ach-top">
                        <h3 className="ent-ach-title">{a.title}</h3>
                        <span className={`ent-ach-state${state.unlocked ? ' is-unlocked' : ''}`}>
                          {state.unlocked ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>
                      <p className="ent-ach-desc">{a.desc}</p>
                      <ProgressBar value={state.percent} label={`${a.title} progress`} />
                      <div className="ent-ach-meta">
                        <span>{progressText}</span>
                        {unlockedAt && <span>{new Date(unlockedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="ent-two-col ent-mt">
          <div className="ent-panel">
            <h2 className="ent-card-title">Personal bests</h2>
            <p className="ent-page-sub">Sirf is device ke local best. Verified global leaderboard nahi.</p>
            <div className="ent-best-list">
              {GAMES.map((g) => (
                <Link key={g.id} to={`/entertainment/games/${g.id}`} className="ent-best-row">
                  <span className="ent-best-row-name"><span aria-hidden="true">{g.emoji}</span> {g.name}</span>
                  <span className="ent-best-row-value">{bestLabel(g, stats.bests[g.id])}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="ent-panel">
            <h2 className="ent-card-title">Data & privacy</h2>
            <p className="ent-page-sub">
              Achievements, scores, streak aur test choices browser ke localStorage mein hain. Hum inhein kisi server ya public
              profile se sync nahi karte. Browser data clear karne par ye delete ho jayenge.
            </p>
            <p className="ent-hint ent-mt">
              Account-synced achievements abhi implement nahi hain, is liye har badge par "local" label hai.
            </p>
            <button type="button" className="btn btn-danger ent-mt" onClick={handleReset}>
              Reset all local progress
            </button>
          </div>
        </section>

        <section className="ent-section">
          <div className="ent-section-head">
            <h2 className="section-title">Recently played</h2>
            <Link to="/entertainment/games" className="btn btn-ghost btn-sm">Arcade <Icon.arrow size={15} /></Link>
          </div>
          {stats.recent && stats.recent.length > 0 ? (
            <div className="ent-recent-row">
              {stats.recent.map((r) => {
                const g = GAMES.find((x) => x.id === r.id);
                if (!g) return null;
                return (
                  <Link key={r.id} to={`/entertainment/games/${g.id}`} className="ent-recent-chip">
                    <span aria-hidden="true">{g.emoji}</span> {g.name}
                    <span className="ent-muted">{new Date(r.at).toLocaleDateString()}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="ent-panel">
              <p className="ent-page-sub">Abhi koi game complete nahi hua. Pehla game khelein — history yahan dikhegi.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

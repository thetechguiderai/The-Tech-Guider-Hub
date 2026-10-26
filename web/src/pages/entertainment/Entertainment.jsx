import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../../App';
import { Icon } from '../../components/ui';
import { EntNav, LocalBadge, ModuleCard, ProgressBar, StatPill } from '../../entertainment/shared';
import { GAMES, bestLabel } from '../../entertainment/games';
import {
  ACHIEVEMENTS,
  achievementState,
  dailyState,
  levelInfo,
  touchVisit,
  useEntStats,
  xpToday,
} from '../../entertainment/storage';
import { QUIZ_CATEGORIES, TOTAL_QUESTION_COUNT } from '../../content/quizzes';

const DAILY_EMOJI = {
  game: '🎮',
  quiz: '📚',
  meme: '🖼️',
  chill: '🎧',
  reaction: '🫸',
  snake: '🐍',
  memory: '🧩',
  test: '🧠',
  flappy: '🪽',
  2048: '🔢',
};

export default function Entertainment() {
  useMeta(
    'Entertainment Zone — The Tech Guider Hub',
    'Free mini games, verified tech quizzes, meme lab, fun tests, chill sounds and local achievements. No account needed; progress stays on your device.'
  );

  useEffect(() => {
    touchVisit();
  }, []);

  const stats = useEntStats();
  const level = levelInfo(stats.xp);
  const daily = dailyState(stats);
  const unlocked = ACHIEVEMENTS.filter((a) => achievementState(a, stats).unlocked).length;
  const recent = (stats.recent || [])
    .map((r) => GAMES.find((g) => g.id === r.id))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />

        <section className="ent-hero">
          <div className="ent-hero-glow" aria-hidden="true" />
          <div className="ent-hero-inner">
            <div className="ent-hero-copy">
              <div className="eyebrow">Entertainment Zone</div>
              <h1 className="ent-hero-title">Your Break Starts Here.</h1>
              <p className="ent-hero-sub">
                Mini games, verified tech quizzes, meme lab, fun tests aur chill sounds — sab free, bina account ke.
                Aapki progress sirf is device par save hoti hai.
              </p>
              <div className="ent-hero-actions">
                <Link to="/entertainment/games" className="btn btn-primary btn-lg">
                  Games khelein <Icon.arrow size={17} />
                </Link>
                <a href="#daily" className="btn btn-ghost btn-lg">Aaj ka challenge</a>
              </div>
              <div className="ent-hero-meta">
                <LocalBadge>Local progress</LocalBadge>
                <span className="ent-muted">No sign-in · No fake leaderboards · No autoplay</span>
              </div>
            </div>
            <div className="ent-hero-art" aria-hidden="true">
              <span className="ent-float ent-float-1">🎮</span>
              <span className="ent-float ent-float-2">🧩</span>
              <span className="ent-float ent-float-3">🏆</span>
              <span className="ent-float ent-float-4">🎧</span>
            </div>
          </div>
        </section>

        <section className="ent-stats-strip" aria-label="Aapki local progress">
          <StatPill label="Level" value={level.level} hint={`${level.into} / ${level.need} XP`} />
          <StatPill label="Total XP" value={stats.xp} hint={`Aaj +${xpToday(stats)}`} />
          <StatPill label="Streak" value={`${stats.streak} din`} hint={`Best ${stats.bestStreak} din`} />
          <StatPill label="Games" value={stats.plays} hint="Completed sessions" />
          <StatPill label="Achievements" value={`${unlocked}/${ACHIEVEMENTS.length}`} hint="Local badges" />
        </section>

        <section className="ent-section ent-two-col" id="daily">
          <div className="ent-daily-card">
            <div className="ent-daily-head">
              <span className="ent-daily-emoji" aria-hidden="true">{DAILY_EMOJI[daily.challenge.type] || '✨'}</span>
              <div>
                <div className="eyebrow">Aaj ka challenge</div>
                <h2 className="ent-card-title">{daily.challenge.title}</h2>
              </div>
              <LocalBadge>{daily.done ? 'Complete' : 'Local date'}</LocalBadge>
            </div>
            <p className="ent-daily-desc">{daily.challenge.desc}</p>
            <div className="ent-daily-foot">
              <span className="ent-tag">+{daily.challenge.xp} XP</span>
              <span className="ent-muted">{daily.date}</span>
              <Link to={daily.challenge.cta} className="btn btn-primary btn-sm">
                {daily.done ? 'Practice / replay' : daily.challenge.ctaLabel}
              </Link>
            </div>
            {daily.done && <p className="ent-success-note">Aaj ka challenge complete — kal naya challenge aayega.</p>}
          </div>

          <div className="ent-level-card">
            <div className="ent-level-top">
              <div>
                <div className="eyebrow">Entertainment XP</div>
                <h2 className="ent-card-title">Level {level.level}</h2>
              </div>
              <span className="ent-level-badge">⭐</span>
            </div>
            <ProgressBar value={level.percent} label={`Level ${level.level} progress`} />
            <div className="ent-level-meta">
              <span>{level.into} XP</span>
              <span>{level.need} XP par Level {level.level + 1}</span>
            </div>
            <p className="ent-hint">
              XP sirf entertainment activities se milta hai. Ye TTG (Guider Currency) nahi hai — TTG sirf daily missions se milta hai.
            </p>
            <Link to="/entertainment/achievements" className="btn btn-ghost btn-sm ent-mt">
              Achievements dekhein
            </Link>
          </div>
        </section>

        <section className="ent-section">
          <div className="ent-section-head">
            <div>
              <h2 className="section-title">Explore the zone</h2>
              <p className="section-sub">Har module asal mein kaam karta hai — koi placeholder card nahi.</p>
            </div>
          </div>
          <div className="ent-module-grid">
            <ModuleCard
              to="/entertainment/games"
              emoji="🎮"
              title="Mini Games"
              desc="Snake, 2048, Tic-Tac-Toe, Memory, Reaction aur Sky Run."
              meta={`${GAMES.length} playable games · local bests`}
              tint="blue"
            />
            <ModuleCard
              to="/entertainment/quizzes"
              emoji="📚"
              title="Quiz Center"
              desc="Technology, gaming aur general knowledge ke verified sawal."
              meta={`${TOTAL_QUESTION_COUNT} questions · ${QUIZ_CATEGORIES.length} categories`}
              tint="green"
            />
            <ModuleCard
              to="/entertainment/memes"
              emoji="🖼️"
              title="Meme Lab"
              desc="Original templates, apna text, font size aur download."
              meta="Canvas-based · files device par rehti hain"
              tint="amber"
            />
            <ModuleCard
              to="/entertainment/fun"
              emoji="🧠"
              title="Fun Tests"
              desc="Would You Rather, This or That, personality test aur brain teaser."
              meta="Entertainment only — science nahi"
              tint="violet"
            />
            <ModuleCard
              to="/entertainment/chill"
              emoji="🎧"
              title="Chill Zone"
              desc="Browser-generated ambient sounds, visualizer aur sleep timer."
              meta="No copyrighted audio"
              tint="cyan"
            />
            <ModuleCard
              to="/entertainment/achievements"
              emoji="🏆"
              title="Achievements"
              desc="Badges, personal bests, streak aur XP progress."
              meta={`${unlocked} / ${ACHIEVEMENTS.length} unlocked`}
              tint="rose"
            />
          </div>
        </section>

        <section className="ent-section">
          <div className="ent-section-head">
            <div>
              <h2 className="section-title">Popular games</h2>
              <p className="section-sub">Sab games desktop aur mobile dono par chalte hain.</p>
            </div>
            <Link to="/entertainment/games" className="btn btn-ghost btn-sm">All games <Icon.arrow size={15} /></Link>
          </div>
          <div className="ent-game-grid">
            {GAMES.map((g) => (
              <Link key={g.id} to={`/entertainment/games/${g.id}`} className="ent-game-card">
                <span className="ent-game-emoji" aria-hidden="true">{g.emoji}</span>
                <span className="ent-game-name">{g.name}</span>
                <span className="ent-game-desc">{g.tagline}</span>
                <span className="ent-game-foot">
                  <span className="ent-tag">{bestLabel(g, stats.bests[g.id])}</span>
                  <span className="ent-game-arrow" aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {recent.length > 0 && (
          <section className="ent-section">
            <div className="ent-section-head">
              <div>
                <h2 className="section-title">Recently played</h2>
                <p className="section-sub">Aapke is device ki local history.</p>
              </div>
            </div>
            <div className="ent-recent-row">
              {recent.map((g) => (
                <Link key={g.id} to={`/entertainment/games/${g.id}`} className="ent-recent-chip">
                  <span aria-hidden="true">{g.emoji}</span> {g.name}
                  <span className="ent-muted">{bestLabel(g, stats.bests[g.id])}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="ent-section">
          <div className="ent-crosslink">
            <div>
              <h2 className="ent-card-title">Daily Fun Zone</h2>
              <p className="ent-page-sub">
                Lucky Spin, Tech Quiz, Fact of the Day, Weekly Poll aur TTG leaderboards — ye alag Fun Zone mein maujood hain.
                Wahan TTG rewards daily missions aur spin se milte hain; Entertainment XP is se alag local system hai.
              </p>
            </div>
            <Link to="/fun" className="btn btn-ghost">Open Fun Zone <Icon.arrow size={15} /></Link>
          </div>
        </section>

        <p className="ent-footnote">
          Entertainment progress browser ke localStorage mein rehti hai. Private/incognito mode ya browser data clear karne par ye
          delete ho sakti hai. Local scores verified global records nahi hain.
        </p>
      </div>
    </div>
  );
}

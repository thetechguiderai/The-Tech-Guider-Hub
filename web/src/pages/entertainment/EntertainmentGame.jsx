import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMeta } from '../../App';
import { EmptyState, Icon, Spinner } from '../../components/ui';
import { EntNav, LocalBadge } from '../../entertainment/shared';
import { GAMES, bestLabel, getGame } from '../../entertainment/games';
import { recordGameResult, useEntStats } from '../../entertainment/storage';

export default function EntertainmentGame() {
  const { gameId } = useParams();
  const game = getGame(gameId);
  const stats = useEntStats();
  const [lastResult, setLastResult] = useState(null);

  useMeta(
    game ? `${game.name} — Entertainment Zone` : 'Game not found — The Tech Guider Hub',
    game
      ? `${game.tagline} ${game.desc} Free browser game, mobile and desktop friendly.`
      : 'This game does not exist in the Entertainment Zone.'
  );

  useEffect(() => {
    setLastResult(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [gameId]);

  const report = useCallback(
    (opts) => {
      if (!game) return null;
      const result = recordGameResult(game.id, opts);
      setLastResult(result);
      return result;
    },
    [game]
  );

  if (!game) {
    return (
      <div className="ent-page">
        <div className="container">
          <EntNav />
          <EmptyState
            title="Ye game maujood nahi"
            desc="Ho sakta hai link purana ho. Arcade mein wapas ja kar saare available games dekhein."
            action={<Link to="/entertainment/games" className="btn btn-primary btn-sm">Arcade kholein</Link>}
          />
        </div>
      </div>
    );
  }

  const best = stats.bests[game.id] || null;
  const GameComponent = game.component;
  const related = GAMES.filter((g) => g.id !== game.id).slice(0, 3);

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />

        <div className="ent-game-head">
          <div>
            <Link to="/entertainment/games" className="ent-back-link">← All games</Link>
            <h1 className="ent-game-title">
              <span aria-hidden="true">{game.emoji}</span> {game.name}
            </h1>
            <p className="ent-page-sub">{game.tagline}</p>
            <div className="ent-game-tags">
              <span className="ent-tag">1 player</span>
              <span className="ent-tag">{game.difficulty}</span>
              <span className="ent-tag">{game.controls}</span>
            </div>
          </div>
          <div className="ent-best-box">
            <span className="ent-best-label">{game.scoreLabel}</span>
            <strong className="ent-best-value">{bestLabel(game, best)}</strong>
            <LocalBadge>Sirf is device par</LocalBadge>
          </div>
        </div>

        {lastResult && (
          <div className={`ent-result-banner${lastResult.isBest ? ' is-best' : ''}`} role="status">
            <span className="ent-result-icon" aria-hidden="true">{lastResult.isBest ? '🏆' : '✅'}</span>
            <div>
              <strong>{lastResult.isBest ? 'Naya personal best!' : 'Game complete'}</strong>
              <span>
                {lastResult.dailyCompleted
                  ? ` Daily challenge bhi complete: ${lastResult.dailyCompleted.title} (+${lastResult.dailyCompleted.xp} XP).`
                  : lastResult.isBest
                    ? ' Naya best aapke local bests mein save ho gaya.'
                    : ' Session aapki local history mein save ho gaya.'}
              </span>
            </div>
            <button type="button" className="ent-result-close" onClick={() => setLastResult(null)} aria-label="Result band karein">×</button>
          </div>
        )}

        <div className="ent-stage">
          <Suspense
            fallback={
              <div className="ent-game-loading">
                <Spinner label={`${game.name} load ho raha hai…`} />
              </div>
            }
          >
            <GameComponent key={game.id} best={best} report={report} />
          </Suspense>
        </div>

        <div className="ent-below-grid">
          <section className="ent-panel">
            <h2 className="ent-card-title">How to play</h2>
            <ol className="ent-instructions">
              {game.instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </section>
          <section className="ent-panel">
            <h2 className="ent-card-title">Score & fairness</h2>
            <p className="ent-page-sub">
              Aapka best score browser ke localStorage mein save hota hai. Ye score sirf aapke device par maujood hai —
              hum isay verified global record ya multiplayer ranking nahi kehte.
            </p>
            <p className="ent-hint ent-mt">
              Browser data clear karne par local bests bhi clear ho jayenge. Koi account sync nahi hai.
            </p>
          </section>
        </div>

        <section className="ent-section">
          <div className="ent-section-head">
            <h2 className="section-title">Aur games</h2>
            <Link to="/entertainment/games" className="btn btn-ghost btn-sm">All games <Icon.arrow size={15} /></Link>
          </div>
          <div className="ent-recent-row">
            {related.map((g) => (
              <Link key={g.id} to={`/entertainment/games/${g.id}`} className="ent-recent-chip">
                <span aria-hidden="true">{g.emoji}</span> {g.name}
                <span className="ent-muted">{bestLabel(g, stats.bests[g.id])}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

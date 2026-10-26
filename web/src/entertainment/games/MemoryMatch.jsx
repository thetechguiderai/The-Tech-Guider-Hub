import React, { useCallback, useEffect, useRef, useState } from 'react';

const FACES = ['🚀', '🎧', '🕹️', '🎲', '🧩', '📱', '💡', '🛰️'];

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function buildDeck() {
  const pairs = shuffle([...FACES, ...FACES]);
  return pairs.map((emoji, id) => ({ id, emoji, flipped: false, matched: false }));
}

export default function MemoryMatch({ best, report }) {
  const [deck, setDeck] = useState(buildDeck);
  const [picks, setPicks] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('playing');
  const [locked, setLocked] = useState(false);
  const timers = useRef([]);
  const finishedRef = useRef(false);
  const reportRef = useRef(report);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    []
  );

  const reset = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    finishedRef.current = false;
    setDeck(buildDeck());
    setPicks([]);
    setMoves(0);
    setSeconds(0);
    setStatus('playing');
    setLocked(false);
  }, []);

  function flip(id) {
    if (locked || status !== 'playing' || !deck[id] || deck[id].matched || deck[id].flipped) return;

    if (picks.length === 0) {
      setDeck((d) => d.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
      setPicks([id]);
      return;
    }

    const firstId = picks[0];
    const first = deck[firstId];
    const second = deck[id];
    const nextMoves = moves + 1;

    setDeck((d) => d.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setPicks([firstId, id]);
    setLocked(true);
    setMoves(nextMoves);

    if (first && second && first.emoji === second.emoji) {
      const matchedDeck = deck.map((c) =>
        c.id === firstId || c.id === id ? { ...c, flipped: true, matched: true } : c
      );
      setDeck(matchedDeck);
      setPicks([]);
      setLocked(false);
      if (matchedDeck.every((c) => c.matched) && !finishedRef.current) {
        finishedRef.current = true;
        setStatus('won');
        if (reportRef.current) {
          reportRef.current({
            score: nextMoves,
            lowerIsBetter: true,
            xp: 25,
            events: [{ type: 'memory', value: 1 }],
            counters: { memClears: 1 },
          });
        }
      }
    } else {
      const timer = window.setTimeout(() => {
        setDeck((d) =>
          d.map((c) => (c.id === firstId || c.id === id ? { ...c, flipped: false } : c))
        );
        setPicks([]);
        setLocked(false);
      }, 760);
      timers.current.push(timer);
    }
  }

  const matchedPairs = deck.filter((c) => c.matched).length / 2;

  return (
    <div className="ent-game">
      <div className="ent-hud">
        <div>
          <span className="ent-hud-label">Moves</span>
          <strong className="ent-hud-value">{moves}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Personal best</span>
          <strong className="ent-hud-value">{best ? `${best} moves` : '—'}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Time</span>
          <strong className="ent-hud-value">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong>
        </div>
        <div className="ent-hud-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={reset}>New board</button>
        </div>
      </div>

      <div className="ent-memory-wrap">
        <div className="ent-memory-board" role="grid" aria-label="Memory card board">
          {deck.map((card) => {
            const show = card.flipped || card.matched;
            return (
              <button
                key={card.id}
                type="button"
                className={`ent-memory-card${show ? ' is-open' : ''}${card.matched ? ' is-matched' : ''}`}
                onClick={() => flip(card.id)}
                aria-label={card.matched ? `Matched card ${card.emoji}` : show ? `Card ${card.emoji}` : 'Hidden card'}
                aria-pressed={show}
                disabled={card.matched || status !== 'playing'}
              >
                <span className="ent-memory-face" aria-hidden="true">{show ? card.emoji : '?'}</span>
              </button>
            );
          })}
        </div>
        {status === 'won' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Board clear! 🎉</p>
            <p className="ent-overlay-sub">{moves} moves · {seconds}s · Personal best {Math.min(best || nextBest(best, moves), moves)}</p>
            <button type="button" className="btn btn-primary" onClick={reset}>Dobara khelein</button>
          </div>
        )}
      </div>

      <div className="ent-progress-meta">
        <span>{matchedPairs} / {FACES.length} pairs matched</span>
        <span className="ent-muted">Kam moves = behtar score</span>
      </div>
      <p className="ent-hint">Do cards khol kar jodi banayein. Sabhi 8 jodiyan milane par board clear hoga.</p>
    </div>
  );
}

function nextBest(best, moves) {
  if (!best) return moves;
  return Math.min(best, moves);
}

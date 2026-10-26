import React, { useEffect, useRef, useState } from 'react';

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winnerOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: 'draw', line: null };
  return null;
}

function emptyCells(board) {
  const out = [];
  board.forEach((v, i) => {
    if (!v) out.push(i);
  });
  return out;
}

/* Computer O hai, human X. O maximize karta hai. */
function minimax(board, player, depth) {
  const result = winnerOf(board);
  if (result) {
    if (result.winner === 'O') return { score: 10 - depth };
    if (result.winner === 'X') return { score: depth - 10 };
    return { score: 0 };
  }
  const cells = emptyCells(board);
  let best = { score: player === 'O' ? -Infinity : Infinity, index: cells[0] };
  for (const i of cells) {
    const next = board.slice();
    next[i] = player;
    const { score } = minimax(next, player === 'O' ? 'X' : 'O', depth + 1);
    if (player === 'O' ? score > best.score : score < best.score) {
      best = { score, index: i };
    }
  }
  return best;
}

function pickAiMove(board, difficulty) {
  const cells = emptyCells(board);
  if (!cells.length) return -1;
  if (difficulty === 'easy') return cells[Math.floor(Math.random() * cells.length)];
  if (difficulty === 'normal' && Math.random() < 0.35) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
  return minimax(board, 'O', 0).index;
}

export default function TicTacToe({ best, report }) {
  const [board, setBoard] = useState(() => Array(9).fill(''));
  const [result, setResult] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [session, setSession] = useState({ wins: 0, losses: 0, draws: 0 });
  const reportedRef = useRef(false);
  const reportRef = useRef(report);
  const aiTimer = useRef(null);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  useEffect(() => {
    const outcome = winnerOf(board);
    if (!outcome) return;
    setResult(outcome);
    if (reportedRef.current) return;
    reportedRef.current = true;
    if (outcome.winner === 'X') {
      setSession((s) => ({ ...s, wins: s.wins + 1 }));
      if (reportRef.current) {
        reportRef.current({
          score: 1,
          xp: 18,
          events: [{ type: 'game', value: 1 }],
          counters: { tttWins: 1 },
        });
      }
    } else if (outcome.winner === 'O') {
      setSession((s) => ({ ...s, losses: s.losses + 1 }));
      if (reportRef.current) reportRef.current({ score: 0, xp: 8, events: [{ type: 'game', value: 1 }] });
    } else {
      setSession((s) => ({ ...s, draws: s.draws + 1 }));
      if (reportRef.current) reportRef.current({ score: 0, xp: 10, events: [{ type: 'game', value: 1 }] });
    }
  }, [board]);

  useEffect(() => {
    if (result) return;
    const filled = board.filter(Boolean).length;
    if (filled === 0 || filled % 2 === 0) return;
    aiTimer.current = window.setTimeout(() => {
      setBoard((prev) => {
        if (winnerOf(prev) || prev.filter(Boolean).length % 2 === 0) return prev;
        const move = pickAiMove(prev, difficulty);
        if (move < 0) return prev;
        const next = prev.slice();
        next[move] = 'O';
        return next;
      });
    }, 420);
    return () => window.clearTimeout(aiTimer.current);
  }, [board, result, difficulty]);

  useEffect(() => () => window.clearTimeout(aiTimer.current), []);

  const filled = board.filter(Boolean).length;
  const humanTurn = !result && filled % 2 === 0;
  const status = result
    ? result.winner === 'X'
      ? 'Aap jeet gaye! 🎉'
      : result.winner === 'O'
        ? 'Computer jeet gaya — dobara koshish karein.'
        : 'Draw! Dono barabar.'
    : humanTurn
      ? 'Aapki baari (X)'
      : 'Computer soch raha hai…';

  function play(i) {
    if (result || board[i] || !humanTurn) return;
    setBoard((prev) => {
      if (prev[i] || winnerOf(prev)) return prev;
      const next = prev.slice();
      next[i] = 'X';
      return next;
    });
  }

  function restart() {
    window.clearTimeout(aiTimer.current);
    reportedRef.current = false;
    setBoard(Array(9).fill(''));
    setResult(null);
  }

  return (
    <div className="ent-game">
      <div className="ent-game-top">
        <div className="ent-status" aria-live="polite">
          <strong>{status}</strong>
          <span className="ent-status-sub">
            {humanTurn ? 'Ek khaali square chunein' : result ? 'Naya round shuru karein' : 'Thora intezar karein'}
          </span>
        </div>
        <div className="ent-game-badges">
          <span className="ent-tag">Best: {best ? 'Win' : '—'}</span>
          <span className="ent-tag">Round {session.wins + session.losses + session.draws}</span>
        </div>
      </div>

      <div className="ent-ttt-wrap">
        <div className="ent-ttt-board" role="grid" aria-label="Tic-Tac-Toe board">
          {board.map((v, i) => {
            const inWin = result && result.line && result.line.includes(i);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={`ent-ttt-cell${v ? ` is-${v.toLowerCase()}` : ''}${inWin ? ' is-win' : ''}`}
                onClick={() => play(i)}
                disabled={!!result || !!v || !humanTurn}
                aria-label={`Square ${i + 1}${v ? `, ${v}` : ', empty'}`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ent-controls-row">
        <label className="ent-field ent-field-inline">
          <span>Computer level</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={board.some(Boolean)}>
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={restart}>
          Naya round
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setSession({ wins: 0, losses: 0, draws: 0 })}>
          Session reset
        </button>
      </div>

      <div className="ent-mini-stats">
        <span><strong>{session.wins}</strong> Wins</span>
        <span><strong>{session.losses}</strong> Losses</span>
        <span><strong>{session.draws}</strong> Draws</span>
        <span className="ent-muted">Session stats sirf is page par hain</span>
      </div>
    </div>
  );
}

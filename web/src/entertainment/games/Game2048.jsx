import React, { useCallback, useEffect, useRef, useState } from 'react';
import { recordMilestone } from '../storage';

const LINES = {
  left: [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
    [12, 13, 14, 15],
  ],
  right: [
    [3, 2, 1, 0],
    [7, 6, 5, 4],
    [11, 10, 9, 8],
    [15, 14, 13, 12],
  ],
  up: [
    [0, 4, 8, 12],
    [1, 5, 9, 13],
    [2, 6, 10, 14],
    [3, 7, 11, 15],
  ],
  down: [
    [12, 8, 4, 0],
    [13, 9, 5, 1],
    [14, 10, 6, 2],
    [15, 11, 7, 3],
  ],
};

function emptyBoard() {
  return Array(16).fill(0);
}

function spawn(board) {
  const free = [];
  board.forEach((v, i) => {
    if (!v) free.push(i);
  });
  if (!free.length) return board;
  const idx = free[Math.floor(Math.random() * free.length)];
  const next = board.slice();
  next[idx] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(vals) {
  const compact = vals.filter(Boolean);
  const out = [];
  let gained = 0;
  for (let i = 0; i < compact.length; i += 1) {
    if (compact[i] === compact[i + 1]) {
      const merged = compact[i] * 2;
      out.push(merged);
      gained += merged;
      i += 1;
    } else {
      out.push(compact[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { out, gained };
}

function moveBoard(board, dir) {
  const next = board.slice();
  let gained = 0;
  let moved = false;
  const lines = LINES[dir];
  if (!lines) return { board, gained: 0, moved: false };
  lines.forEach((line) => {
    const values = line.map((i) => board[i]);
    const result = slide(values);
    gained += result.gained;
    line.forEach((idx, j) => {
      if (next[idx] !== result.out[j]) moved = true;
      next[idx] = result.out[j];
    });
  });
  return { board: next, gained, moved };
}

function canMove(board) {
  if (board.some((v) => !v)) return true;
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const i = r * 4 + c;
      if (c < 3 && board[i] === board[i + 1]) return true;
      if (r < 3 && board[i] === board[i + 4]) return true;
    }
  }
  return false;
}

function highest(board) {
  return board.reduce((m, v) => (v > m ? v : m), 0);
}

function startBoard() {
  return spawn(spawn(emptyBoard()));
}

export default function Game2048({ best, report }) {
  const boardRef = useRef(startBoard());
  const scoreRef = useRef(0);
  const statusRef = useRef('playing');
  const wonRef = useRef(false);
  const reportedRef = useRef(false);
  const reportRef = useRef(report);

  const [board, setBoard] = useState(boardRef.current);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('playing');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  const reset = useCallback(() => {
    boardRef.current = startBoard();
    scoreRef.current = 0;
    statusRef.current = 'playing';
    wonRef.current = false;
    reportedRef.current = false;
    setBoard(boardRef.current);
    setScore(0);
    setStatus('playing');
    setNotice('');
  }, []);

  const applyMove = useCallback((dir) => {
    if (statusRef.current !== 'playing') return;
    const result = moveBoard(boardRef.current, dir);
    if (!result.moved) return;
    const next = spawn(result.board);
    boardRef.current = next;
    scoreRef.current += result.gained;
    setBoard(next);
    setScore(scoreRef.current);

    const top = highest(next);
    if (top >= 2048 && !wonRef.current) {
      wonRef.current = true;
      setNotice('2048 bann gaya! Aap khelte rah sakte hain.');
      recordMilestone({
        counters: { tile2048: 1 },
        events: [{ type: '2048', value: 2048 }],
        xp: 20,
      });
    }

    if (!canMove(next)) {
      statusRef.current = 'over';
      setStatus('over');
      if (!reportedRef.current) {
        reportedRef.current = true;
        if (reportRef.current) {
          reportRef.current({
            score: scoreRef.current,
            xp: 20 + Math.min(40, Math.floor(scoreRef.current / 1000) * 5),
            events: [{ type: '2048', value: highest(next) }],
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const key = e.key;
      let dir = null;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') dir = 'left';
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') dir = 'right';
      else if (key === 'ArrowUp' || key === 'w' || key === 'W') dir = 'up';
      else if (key === 'ArrowDown' || key === 's' || key === 'S') dir = 'down';
      if (!dir) return;
      e.preventDefault();
      applyMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyMove]);

  const touch = useRef(null);

  function onTouchStart(e) {
    const t = e.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? 'right' : 'left');
    else applyMove(dy > 0 ? 'down' : 'up');
  }

  return (
    <div className="ent-game">
      <div className="ent-hud">
        <div>
          <span className="ent-hud-label">Score</span>
          <strong className="ent-hud-value">{score}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Personal best</span>
          <strong className="ent-hud-value">{Math.max(best || 0, score)}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Top tile</span>
          <strong className="ent-hud-value">{highest(board)}</strong>
        </div>
        <div className="ent-hud-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={reset}>New game</button>
        </div>
      </div>

      <div className="ent-canvas-wrap ent-2048-wrap">
        <div
          className="ent-2048-board"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="grid"
          aria-label="2048 board"
        >
          {board.map((v, i) => (
            <div
              key={i}
              role="gridcell"
              aria-label={v ? String(v) : 'empty'}
              className={`ent-2048-cell${v ? ` v-${v <= 2048 ? v : 'super'}` : ' is-empty'}`}
            >
              {v || ''}
            </div>
          ))}
        </div>
        {status === 'over' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">No moves left</p>
            <p className="ent-overlay-sub">Score {score} · Top tile {highest(board)}</p>
            <button type="button" className="btn btn-primary" onClick={reset}>Dobara khelein</button>
          </div>
        )}
      </div>

      {notice && <p className="ent-success-note" role="status">{notice}</p>}
      <p className="ent-hint">Arrow keys / WASD ya board par swipe karein. Milte julte numbers merge hote hain.</p>
    </div>
  );
}

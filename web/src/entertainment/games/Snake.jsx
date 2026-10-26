import React, { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 20;
const ROWS = 20;
const CELL = 21;
const SIZE = COLS * CELL;

function randomFood(snake) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (!free.length) return { x: -1, y: -1 };
  return free[Math.floor(Math.random() * free.length)];
}

function freshGame() {
  const snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  return {
    snake,
    dir: { x: 1, y: 0 },
    queue: [],
    food: randomFood(snake),
    score: 0,
    speed: 135,
    status: 'playing',
    paused: false,
  };
}

function idleGame() {
  const g = freshGame();
  g.status = 'idle';
  return g;
}

function stepGame(g) {
  if (g.status !== 'playing' || g.paused) return { ate: false, dead: false };
  if (g.queue.length) g.dir = g.queue.shift();
  const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
    g.status = 'over';
    return { ate: false, dead: true };
  }
  const ate = head.x === g.food.x && head.y === g.food.y;
  const body = ate ? g.snake : g.snake.slice(0, -1);
  if (body.some((s) => s.x === head.x && s.y === head.y)) {
    g.status = 'over';
    return { ate: false, dead: true };
  }
  g.snake.unshift(head);
  if (ate) {
    g.score += 1;
    g.food = randomFood(g.snake);
    if (g.score % 4 === 0) g.speed = Math.max(75, g.speed - 6);
  } else {
    g.snake.pop();
  }
  return { ate, dead: false };
}

function rounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGame(ctx, g) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, SIZE);
    ctx.stroke();
  }
  for (let i = 1; i < ROWS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(SIZE, i * CELL + 0.5);
    ctx.stroke();
  }

  if (g.food.x >= 0) {
    const cx = g.food.x * CELL + CELL / 2;
    const cy = g.food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(248,113,113,0.85)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  g.snake.forEach((seg, i) => {
    const ratio = i / Math.max(1, g.snake.length - 1);
    const shade = Math.round(255 - ratio * 130);
    ctx.fillStyle = i === 0 ? '#ffffff' : `rgb(${shade},${shade},${shade})`;
    rounded(ctx, seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, 5);
    ctx.fill();
  });

  const head = g.snake[0];
  if (head) {
    const hx = head.x * CELL + CELL / 2;
    const hy = head.y * CELL + CELL / 2;
    ctx.fillStyle = '#0a0a0a';
    const ox = g.dir.y !== 0 ? 3 : g.dir.x * 2;
    const oy = g.dir.x !== 0 ? 3 : g.dir.y * 2;
    ctx.beginPath();
    ctx.arc(hx - 4 + ox, hy - oy, 1.6, 0, Math.PI * 2);
    ctx.arc(hx + 4 + ox, hy + oy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function Snake({ best, report }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(idleGame());
  const finishedRef = useRef(false);
  const reportRef = useRef(report);
  const [status, setStatus] = useState('idle');
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let last = 0;
    let acc = 0;

    const loop = (time) => {
      if (!last) last = time;
      const dt = Math.min(180, time - last);
      last = time;
      const g = gameRef.current;
      if (g && g.status === 'playing' && !g.paused) {
        acc += dt;
        let guard = 0;
        while (acc >= g.speed && guard < 4) {
          acc -= g.speed;
          guard += 1;
          const res = stepGame(g);
          if (res.ate) setScore(g.score);
          if (res.dead) {
            setStatus('over');
            setPaused(false);
            if (!finishedRef.current) {
              finishedRef.current = true;
              if (reportRef.current) {
                reportRef.current({
                  score: g.score,
                  xp: 10 + Math.min(40, g.score * 2),
                  events: [{ type: 'snake', value: g.score }],
                });
              }
            }
            break;
          }
        }
      }
      drawGame(ctx, gameRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const start = useCallback(() => {
    gameRef.current = freshGame();
    finishedRef.current = false;
    setScore(0);
    setStatus('playing');
    setPaused(false);
    const canvas = canvasRef.current;
    if (canvas) canvas.focus();
  }, []);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.status !== 'playing') return;
    g.paused = !g.paused;
    setPaused(g.paused);
  }, []);

  const queueDir = useCallback((x, y) => {
    const g = gameRef.current;
    if (!g || g.status !== 'playing' || g.paused) return;
    const lastDir = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
    if (lastDir.x === -x && lastDir.y === -y) return;
    if (lastDir.x === x && lastDir.y === y) return;
    if (g.queue.length < 2) g.queue.push({ x, y });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const g = gameRef.current;
      const key = e.key;
      const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key);
      if (isArrow) e.preventDefault();
      if (key === 'ArrowUp' || key === 'w' || key === 'W') queueDir(0, -1);
      else if (key === 'ArrowDown' || key === 's' || key === 'S') queueDir(0, 1);
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') queueDir(-1, 0);
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') queueDir(1, 0);
      else if (key === ' ') {
        if (!g || g.status !== 'playing') start();
        else togglePause();
      } else if (key === 'Enter' && (!g || g.status !== 'playing')) start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queueDir, start, togglePause]);

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
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 1 : -1, 0);
    else queueDir(0, dy > 0 ? 1 : -1);
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
          <strong className="ent-hud-value">{best || 0}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Level</span>
          <strong className="ent-hud-value">{Math.floor(score / 4) + 1}</strong>
        </div>
        <div className="ent-hud-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={togglePause} disabled={status !== 'playing'}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={start}>
            {status === 'idle' ? 'Start' : 'Restart'}
          </button>
        </div>
      </div>

      <div className="ent-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="ent-canvas ent-snake-canvas"
          tabIndex={0}
          aria-label="Snake game board. Arrow keys, WASD or swipe to move."
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
        {status === 'idle' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Snake</p>
            <p className="ent-overlay-sub">Arrow keys / WASD / swipe se snake chalaayein. Deewar aur khud se bachein.</p>
            <button type="button" className="btn btn-primary" onClick={start}>Start game</button>
          </div>
        )}
        {status === 'over' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Game over</p>
            <p className="ent-overlay-sub">Score {score} · Personal best {Math.max(best || 0, score)}</p>
            <button type="button" className="btn btn-primary" onClick={start}>Dobara khelein</button>
          </div>
        )}
        {paused && status === 'playing' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Paused</p>
            <button type="button" className="btn btn-primary" onClick={togglePause}>Resume</button>
          </div>
        )}
      </div>

      <div className="ent-dpad" aria-label="Snake controls">
        <button type="button" className="ent-dpad-btn ent-dpad-up" onClick={() => queueDir(0, -1)} aria-label="Up">▲</button>
        <button type="button" className="ent-dpad-btn ent-dpad-left" onClick={() => queueDir(-1, 0)} aria-label="Left">◀</button>
        <button type="button" className="ent-dpad-btn ent-dpad-down" onClick={() => queueDir(0, 1)} aria-label="Down">▼</button>
        <button type="button" className="ent-dpad-btn ent-dpad-right" onClick={() => queueDir(1, 0)} aria-label="Right">▶</button>
      </div>

      <p className="ent-hint">Har 4 food par speed thori barhti hai. Pause ke liye Space dabayein.</p>
    </div>
  );
}

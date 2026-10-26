import React, { useCallback, useEffect, useRef, useState } from 'react';

const W = 360;
const H = 520;
const GROUND = 42;
const GRAVITY = 0.42;
const FLAP = -7.1;
const PIPE_W = 58;
const GAP = 146;
const SPEED = 2.35;
const SPAWN_EVERY = 96;

const STARS = Array.from({ length: 42 }).map((_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.123;
  return {
    x: (a - Math.floor(a)) * W,
    y: (b - Math.floor(b)) * (H - GROUND - 40),
    r: 0.5 + ((i * 7) % 10) / 12,
    alpha: 0.08 + ((i * 13) % 20) / 90,
  };
});

function freshGame() {
  return {
    status: 'playing',
    bird: { x: 88, y: 245, vy: 0, r: 13 },
    pipes: [{ x: W + 30, gapY: 240, scored: false }],
    score: 0,
    spawn: 0,
    paused: false,
  };
}

function idleGame() {
  return { status: 'idle', bird: { x: 88, y: 245, vy: 0, r: 13 }, pipes: [], score: 0, spawn: 0, paused: false };
}

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function updateGame(g, dt, onScore) {
  if (g.status !== 'playing' || g.paused) return false;
  const bird = g.bird;
  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;

  g.spawn += dt;
  if (g.spawn >= SPAWN_EVERY) {
    g.spawn = 0;
    const min = 100;
    const max = H - GROUND - 110;
    g.pipes.push({ x: W + 10, gapY: min + Math.random() * (max - min), scored: false });
  }

  g.pipes.forEach((p) => {
    p.x -= SPEED * dt;
    if (!p.scored && p.x + PIPE_W < bird.x - bird.r) {
      p.scored = true;
      g.score += 1;
      if (onScore) onScore(g.score);
    }
  });
  g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -10);

  if (bird.y + bird.r >= H - GROUND) {
    bird.y = H - GROUND - bird.r;
    g.status = 'over';
    return true;
  }
  if (bird.y - bird.r <= 0) {
    g.status = 'over';
    return true;
  }

  for (const p of g.pipes) {
    if (bird.x + bird.r < p.x || bird.x - bird.r > p.x + PIPE_W) continue;
    const topEnd = p.gapY - GAP / 2;
    const bottomStart = p.gapY + GAP / 2;
    if (
      circleRect(bird.x, bird.y, bird.r - 1, p.x, 0, PIPE_W, topEnd) ||
      circleRect(bird.x, bird.y, bird.r - 1, p.x, bottomStart, PIPE_W, H - GROUND - bottomStart)
    ) {
      g.status = 'over';
      return true;
    }
  }
  return false;
}

function drawGame(ctx, g, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#111111');
  grad.addColorStop(1, '#050505');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  STARS.forEach((s) => {
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  g.pipes.forEach((p) => {
    const topH = p.gapY - GAP / 2;
    const bottomY = p.gapY + GAP / 2;
    const bottomH = H - GROUND - bottomY;
    ctx.fillStyle = '#202020';
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.fillRect(p.x, 0, PIPE_W, topH);
    ctx.strokeRect(p.x + 1, -2, PIPE_W - 2, topH + 2);
    ctx.fillRect(p.x, bottomY, PIPE_W, bottomH);
    ctx.strokeRect(p.x + 1, bottomY, PIPE_W - 2, bottomH);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(p.x - 4, topH - 16, PIPE_W + 8, 16);
    ctx.fillRect(p.x - 4, bottomY, PIPE_W + 8, 16);
    ctx.strokeStyle = '#5a5a5a';
    ctx.strokeRect(p.x - 3, topH - 15, PIPE_W + 6, 14);
    ctx.strokeRect(p.x - 3, bottomY + 1, PIPE_W + 6, 14);
  });

  if (g.status === 'idle') {
    const bob = Math.sin(time / 420) * 7;
    g.bird.y = 245 + bob;
  }

  const b = g.bird;
  ctx.save();
  ctx.translate(b.x, b.y);
  const rot = g.status === 'playing' ? Math.max(-0.5, Math.min(1.1, b.vy / 12)) : 0.15;
  ctx.rotate(rot);
  ctx.fillStyle = '#f4f4f5';
  ctx.beginPath();
  ctx.arc(0, 0, b.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(5, -4, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.moveTo(b.r - 1, 0);
  ctx.lineTo(b.r + 8, 3);
  ctx.lineTo(b.r - 1, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-2, 3, 6, 0.2, 2.4);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, H - GROUND, W, GROUND);
  ctx.strokeStyle = '#2c2c2c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - GROUND + 1);
  ctx.lineTo(W, H - GROUND + 1);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x < W; x += 24) {
    ctx.fillRect(x, H - GROUND + 8, 12, 3);
  }
}

export default function Flappy({ best, report }) {
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

    const loop = (time) => {
      if (!last) last = time;
      const dt = Math.min(2.6, Math.max(0.4, (time - last) / 16.6667));
      last = time;
      const g = gameRef.current;
      const died = updateGame(g, dt, (s) => setScore(s));
      if (died) {
        setStatus('over');
        setPaused(false);
        if (!finishedRef.current) {
          finishedRef.current = true;
          if (reportRef.current) {
            reportRef.current({
              score: g.score,
              xp: 12 + Math.min(35, g.score * 3),
              events: [{ type: 'flappy', value: g.score }],
            });
          }
        }
      }
      drawGame(ctx, g, time);
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
  }, []);

  const flap = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.status !== 'playing' || g.paused) return;
    g.bird.vy = FLAP;
  }, []);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.status !== 'playing') return;
    g.paused = !g.paused;
    setPaused(g.paused);
  }, []);

  const tap = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.status !== 'playing') {
      start();
      window.setTimeout(() => {
        if (gameRef.current && gameRef.current.status === 'playing') gameRef.current.bird.vy = FLAP;
      }, 0);
      return;
    }
    if (g.paused) {
      g.paused = false;
      setPaused(false);
      return;
    }
    flap();
  }, [flap, start]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        tap();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
      }
    };
    const onVisibility = () => {
      const g = gameRef.current;
      if (document.hidden && g && g.status === 'playing' && !g.paused) {
        g.paused = true;
        setPaused(true);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tap, togglePause]);

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
          <span className="ent-hud-label">Status</span>
          <strong className="ent-hud-value">{status === 'idle' ? 'Ready' : paused ? 'Paused' : status === 'over' ? 'Over' : 'Flying'}</strong>
        </div>
        <div className="ent-hud-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={togglePause} disabled={status !== 'playing'}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={start}>Restart</button>
        </div>
      </div>

      <div className="ent-canvas-wrap ent-flappy-wrap">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="ent-canvas ent-flappy-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            tap();
          }}
          role="img"
          aria-label="Flappy-style game. Click, tap or press Space to flap."
        />
        {status === 'idle' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Sky Run</p>
            <p className="ent-overlay-sub">Click / tap / Space se bird ko udayein aur pipes ke beech se guzrein.</p>
            <button type="button" className="btn btn-primary" onClick={start}>Start flying</button>
          </div>
        )}
        {status === 'over' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Flight over</p>
            <p className="ent-overlay-sub">Score {score} · Personal best {Math.max(best || 0, score)}</p>
            <button type="button" className="btn btn-primary" onClick={start}>Dobara udein</button>
          </div>
        )}
        {paused && status === 'playing' && (
          <div className="ent-canvas-overlay">
            <p className="ent-overlay-title">Paused</p>
            <button type="button" className="btn btn-primary" onClick={togglePause}>Resume</button>
          </div>
        )}
      </div>
      <p className="ent-hint">Har pipe cross karne par score barhta hai. Space / P se pause bhi kar sakte hain.</p>
    </div>
  );
}

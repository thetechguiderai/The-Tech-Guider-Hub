import React, { useCallback, useEffect, useRef, useState } from 'react';

const ROUNDS = 5;

export default function ReactionTest({ best, report }) {
  const [phase, setPhase] = useState('idle');
  const [times, setTimes] = useState([]);
  const [last, setLast] = useState(null);
  const [average, setAverage] = useState(null);
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);
  const startAtRef = useRef(0);
  const finishedRef = useRef(false);
  const reportRef = useRef(report);

  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
    },
    []
  );

  const startRound = useCallback(() => {
    window.clearTimeout(timerRef.current);
    finishedRef.current = false;
    setLast(null);
    setMessage('');
    setPhase('wait');
    const delay = 1100 + Math.random() * 2300;
    timerRef.current = window.setTimeout(() => {
      startAtRef.current = performance.now();
      setPhase('ready');
    }, delay);
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setTimes([]);
    setAverage(null);
    setLast(null);
    setMessage('');
    setPhase('idle');
    finishedRef.current = false;
  }, []);

  function finish(nextTimes) {
    const sum = nextTimes.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / nextTimes.length);
    setAverage(avg);
    setPhase('done');
    if (!finishedRef.current) {
      finishedRef.current = true;
      if (reportRef.current) {
        reportRef.current({
          score: avg,
          lowerIsBetter: true,
          xp: 15,
          events: [{ type: 'reaction', value: 1 }],
        });
      }
    }
  }

  function tap() {
    if (phase === 'idle' || phase === 'early') {
      if (times.length >= ROUNDS) setTimes([]);
      startRound();
      return;
    }
    if (phase === 'wait') {
      window.clearTimeout(timerRef.current);
      setPhase('early');
      setMessage('Bahut jaldi! Green rang ka intezar karein.');
      return;
    }
    if (phase === 'ready') {
      const ms = Math.max(1, Math.round(performance.now() - startAtRef.current));
      const nextTimes = [...times, ms];
      setTimes(nextTimes);
      setLast(ms);
      if (nextTimes.length >= ROUNDS) {
        finish(nextTimes);
      } else {
        setPhase('round');
        setMessage('Acha! Agla round taiyar hai.');
      }
      return;
    }
    if (phase === 'round') {
      startRound();
      return;
    }
    if (phase === 'done') {
      reset();
      startRound();
    }
  }

  const prompt = {
    idle: ['Reaction Test', 'Jab stage green ho jaye tab jaldi se click / tap karein.'],
    wait: ['Wait…', 'Red stage par click mat karein.'],
    ready: ['CLICK NOW!', 'Ab click karein.'],
    early: ['Too soon', 'Green hone se pehle click ho gaya.'],
    round: [`${last || 0} ms`, 'Agla round shuru karein.'],
    done: [`${average || 0} ms average`, '5 rounds mukammal. Dobara try karein.'],
  }[phase] || ['', ''];

  return (
    <div className="ent-game">
      <div className="ent-hud">
        <div>
          <span className="ent-hud-label">Personal best</span>
          <strong className="ent-hud-value">{best ? `${best} ms` : '—'}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Average</span>
          <strong className="ent-hud-value">{average ? `${average} ms` : '—'}</strong>
        </div>
        <div>
          <span className="ent-hud-label">Round</span>
          <strong className="ent-hud-value">{Math.min(times.length + (phase === 'done' ? 0 : 1), ROUNDS)} / {ROUNDS}</strong>
        </div>
        <div className="ent-hud-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="ent-reaction-dots" aria-hidden="true">
        {Array.from({ length: ROUNDS }).map((_, i) => (
          <span key={i} className={`ent-reaction-dot${times[i] ? ' is-done' : ''}${i === times.length && phase !== 'done' ? ' is-current' : ''}`} />
        ))}
      </div>

      <button
        type="button"
        className={`ent-reaction-stage is-${phase}`}
        onClick={tap}
        aria-live="polite"
      >
        <span className="ent-reaction-title">{prompt[0]}</span>
        <span className="ent-reaction-sub">
          {phase === 'early' ? message : phase === 'done' ? message : prompt[1]}
        </span>
        {times.length > 0 && phase !== 'done' && (
          <span className="ent-reaction-times">
            {times.map((t, i) => (
              <span key={i}>{t} ms</span>
            ))}
          </span>
        )}
        {phase === 'done' && (
          <span className="ent-reaction-times">
            {times.map((t, i) => (
              <span key={i}>{t} ms</span>
            ))}
          </span>
        )}
      </button>

      <p className="ent-hint">
        Sahi tareeqa: har round mein pehle wait karein, phir green par click karein. Jaldi click karne se round cancel ho jata hai.
      </p>
    </div>
  );
}

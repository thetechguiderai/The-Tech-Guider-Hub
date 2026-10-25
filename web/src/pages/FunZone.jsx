import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { funApi, publicApi } from '../api';
import { useMeta } from '../App';
import { Icon, Spinner } from '../components/ui';
import QUIZ_QUESTIONS, { QUIZ_ROUND_SIZE } from '../data/quizQuestions';

// ============================== Spin Wheel ==================================
// Server hi segment choose karta hai (fair odds) — frontend sirf animation.
function SpinWheel() {
  const [status, setStatus] = useState({ loading: true, signedIn: false, canSpin: false, balance: null });
  const [segments, setSegments] = useState([5, 10, 15, 20, 5, 10, 15, 5, 10, 15, 5, 10]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    funApi.spinStatus()
      .then((d) => setStatus({ loading: false, ...d }))
      .catch(() => setStatus({ loading: false, signedIn: false, canSpin: false, balance: null }));
  };
  useEffect(load, []);

  async function spin() {
    setError('');
    setResult(null);
    setSpinning(true);
    try {
      const r = await funApi.spin();
      setSegments(r.segments || segments);
      // Target segment ko pointer (top) par lane ke liye rotation kum hui?
      const per = 360 / (r.segments?.length || segments.length);
      const target = 360 * 5 + (360 - r.segmentIndex * per - per / 2);
      setRotation((cur) => cur + (target - (cur % 360)) + 360 * 0);
      setTimeout(() => {
        setSpinning(false);
        setResult(r);
        setStatus((s) => ({ ...s, canSpin: false, balance: r.balance }));
        // Header TTG badge ko foran update karo
        window.dispatchEvent(new Event('ttg:updated'));
      }, 3200);
    } catch (e) {
      setSpinning(false);
      setError(e.message || 'Spin fail hua.');
    }
  }

  const colors = ['#2563eb', '#7c3aed', '#0891b2', '#f59e0b', '#ec4899', '#16a34a'];
  const n = segments.length;
  const per = 360 / n;
  const conic = segments
    .map((seg, i) => {
      const from = i * per;
      const to = (i + 1) * per;
      return `${colors[i % colors.length]} ${from}deg ${to}deg`;
    })
    .join(', ');

  return (
    <div className="card" style={{ padding: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 210, height: 210, flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 2, fontSize: 22 }}>▼</div>
        <div
          style={{
            width: 210,
            height: 210,
            borderRadius: '50%',
            background: `conic-gradient(${conic})`,
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 3s cubic-bezier(.17,.67,.12,.99)',
            border: '6px solid var(--border, #e5e7eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg, #fff)', border: '1px solid var(--border, #e5e7eb)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 15 }}>
            TTG
          </div>
        </div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🎖 Daily Lucky Spin</div>
        <div className="text-sm muted3" style={{ margin: '6px 0 10px' }}>
          Roz <strong>1 free spin</strong> — 5, 10, 15 ya 20 TTG jeeto! Ye aap ka doosra daily mission hai.
        </div>
        {status.loading && <Spinner label="Spin status load ho raha…" />}
        {!status.loading && !status.signedIn && (
          <Link to="/ai" className="btn btn-blue btn-sm" style={{ textDecoration: 'none' }}>
            Spin karne ke liye sign in karein <Icon.arrow size={13} />
          </Link>
        )}
        {!status.loading && status.signedIn && (
          <>
            <div className="text-sm muted3" style={{ marginBottom: 10 }}>
              Balance: <strong>{status.balance} TTG</strong> {status.canSpin ? '· Aaj ka spin available!' : '· Aaj ka spin complete ✓'}
            </div>
            <button className="btn btn-blue" onClick={spin} disabled={!status.canSpin || spinning}>
              {spinning ? 'Spinning…' : status.canSpin ? '🎡 Spin karein' : 'Kal phir try karein'}
            </button>
          </>
        )}
        {result && (
          <div className="text-sm" style={{ marginTop: 12, fontWeight: 700, color: 'var(--green, #16a34a)' }}>
            🎉 +{result.won} TTG mil gaye! (Total: {result.balance} TTG)
          </div>
        )}
        {error && <div className="text-sm" style={{ marginTop: 12, color: 'var(--red, #dc2626)' }}>⚠ {error}</div>}
      </div>
    </div>
  );
}

// ============================== Tech Quiz ===================================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function TechQuiz() {
  const [phase, setPhase] = useState('intro'); // intro | play | result
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState({ signedIn: false, best: 0, plays: 0 });
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadBest = () => {
    funApi.quizMe().then(setBest).catch(() => setBest({ signedIn: false, best: 0, plays: 0 }));
  };
  useEffect(loadBest, []);

  function start() {
    setQuestions(shuffle(QUIZ_QUESTIONS).slice(0, QUIZ_ROUND_SIZE));
    setStep(0);
    setScore(0);
    setSaved(null);
    setPhase('play');
  }

  async function answer(idx) {
    if (picked !== null) return;
    setPicked(idx);
    const ok = idx === questions[step].answer;
    if (ok) setScore((s) => s + 1);
    setTimeout(async () => {
      if (step + 1 < questions.length) {
        setStep((s) => s + 1);
        setPicked(null);
      } else {
        const finalScore = score + (ok ? 1 : 0);
        setPhase('result');
        setBusy(true);
        try {
          const r = await funApi.quizScore(finalScore);
          setSaved(r);
        } catch {
          setSaved(null);
        }
        setBusy(false);
        loadBest();
      }
    }, 1400);
  }

  if (phase === 'intro') {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🧠 Tech Quiz</div>
        <p className="text-sm muted3" style={{ margin: '8px 0 14px' }}>
          {QUIZ_ROUND_SIZE} sawal, sirf <strong>fun</strong> ke liye (TTG nahi milta). Takreeban tech, YouTube aur games ke general knowledge sawal.
          {best.signedIn && ` Aap ka best score: ${best.best}/${QUIZ_ROUND_SIZE} · Total games: ${best.plays}`}
        </p>
        <button className="btn btn-blue" onClick={start}>Quiz shuru karein</button>
        {!best.signedIn && <div className="text-xs muted3" style={{ marginTop: 10 }}>Score save karne ke liye AI workspace mein sign in ho.</div>}
      </div>
    );
  }

  if (phase === 'play') {
    const q = questions[step];
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="text-xs muted3">Sawal {step + 1}/{questions.length} · Score {score}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>{q.q}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {q.options.map((opt, i) => {
            let style = {};
            let className = 'btn btn-ghost';
            if (picked !== null) {
              if (i === q.answer) className = 'btn btn-blue';
              else if (i === picked) className = 'btn btn-ghost';
              style = i === picked ? { opacity: 0.85 } : { opacity: 0.6 };
            }
            return (
              <button
                key={i}
                className={className}
                style={{ textAlign: 'left', justifyContent: 'flex-start', textDecoration: 'none', ...style }}
                onClick={() => answer(i)}
                disabled={picked !== null}
              >
                {String.fromCharCode(65 + i)}. {opt}
                {picked !== null && i === q.answer && ' ✓'}
                {picked !== null && i === picked && i !== q.answer && ' ✗'}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="text-xs muted3" style={{ marginTop: 12 }}>
            {picked === questions[step].answer ? '✅ Sahi! ' : '❌ Galat — '}
            {questions[step].explain}
          </div>
        )}
      </div>
    );
  }

  // result
  return (
    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ fontWeight: 800, fontSize: 22 }}>Quiz complete!</div>
      <div style={{ fontWeight: 700, fontSize: 30, margin: '10px 0' }}>{score}/{questions.length}</div>
      {score === questions.length && <div className="text-sm">🏆 MashAllah — full score!</div>}
      {score >= questions.length / 2 && score < questions.length && <div className="text-sm">👏 Shabash!</div>}
      {score < questions.length / 2 && <div className="text-sm">💪 Practice karein — dobara try!</div>}
      {busy && <div style={{ marginTop: 12 }}><Spinner label="Score save ho raha…" /></div>}
      {saved && saved.isNewRecord && !busy && (
        <div className="text-sm" style={{ marginTop: 8, color: 'var(--green, #16a34a)', fontWeight: 700 }}>🎊 Naya personal best saved!</div>
      )}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-blue" onClick={start}>Dobara khelen</button>
        <button className="btn btn-ghost" onClick={() => setPhase('intro')}>Menu</button>
      </div>
    </div>
  );
}

// ============================ Fact of the Day ===============================
function FactOfDay() {
  const [fact, setFact] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    funApi.fact().then(setFact).catch(() => setFact(null));
  }, []);
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 17 }}>💡 Tech Fact of the Day</div>
      {fact ? (
        <>
          <p style={{ margin: '10px 0 12px', fontSize: 15, lineHeight: 1.6 }}>{fact.fact}</p>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              try {
                navigator.clipboard?.writeText(fact.fact + ' — The Tech Guider Hub');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch { /* clipboard unavailable */ }
            }}
          >
            {copied ? '✓ Copy ho gaya' : <><Icon.copy size={14} /> Copy karein</>}
          </button>
        </>
      ) : (
        <div className="text-sm muted3">Fact load nahi hua — thori dair baad try karein.</div>
      )}
    </div>
  );
}

// ============================== Weekly Poll =================================
function WeeklyPoll() {
  const [poll, setPoll] = useState({ loading: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    funApi.poll().then((d) => setPoll({ loading: false, ...d })).catch(() => setPoll({ loading: false, error: true }));
  };
  useEffect(load, []);

  async function vote(idx) {
    setBusy(true);
    setMsg('');
    try {
      const r = await funApi.pollVote(idx);
      setPoll((p) => ({ ...p, myVote: r.myVote, counts: r.counts }));
      setMsg('✓ Aap ka vote save ho gaya!');
    } catch (e) {
      setMsg(e.message || 'Vote fail hua.');
    }
    setBusy(false);
  }

  if (poll.loading) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>📊 Weekly Poll</div>
        <div style={{ marginTop: 10 }}><Spinner label="Poll load ho raha…" /></div>
      </div>
    );
  }
  if (poll.error) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>📊 Weekly Poll</div>
        <div className="text-sm muted3" style={{ marginTop: 8 }}>Poll load nahi hua — thori dair baad try karein.</div>
      </div>
    );
  }
  const total = poll.total || 0;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 17 }}>📊 Weekly Poll</div>
      <div className="text-sm" style={{ margin: '8px 0 14px' }}>{poll.question}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {poll.options.map((opt, i) => {
          const c = poll.counts[i] || 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          const mine = poll.myVote === i;
          return (
            <button
              key={i}
              className="btn btn-ghost"
              style={{ textAlign: 'left', justifyContent: 'flex-start', textDecoration: 'none', position: 'relative', overflow: 'hidden' }}
              onClick={() => poll.signedIn && poll.myVote === null && vote(i)}
              disabled={busy || !poll.signedIn || poll.myVote !== null}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>
                {String.fromCharCode(65 + i)}. {opt}{mine ? ' ✓' : ''}
              </span>
              {poll.myVote !== null && (
                <span style={{ position: 'absolute', right: 12, zIndex: 1, fontWeight: 600 }}>{pct}% ({c})</span>
              )}
              {poll.myVote !== null && (
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--blue-soft, rgba(37,99,235,.15))' }} />
              )}
            </button>
          );
        })}
      </div>
      {poll.signedIn && poll.myVote === null && <div className="text-xs muted3" style={{ marginTop: 10 }}>Option pe click kar ke vote dein.</div>}
      {!poll.signedIn && (
        <div style={{ marginTop: 10 }}>
          <Link to="/ai" className="btn btn-blue btn-sm" style={{ textDecoration: 'none' }}>Vote karne ke liye sign in karein</Link>
        </div>
      )}
      {msg && <div className="text-xs muted3" style={{ marginTop: 10 }}>{msg}</div>}
    </div>
  );
}

// ============================== Leaderboard =================================
function Leaderboard() {
  const [data, setData] = useState({ loading: true, entries: null });
  const [quiz, setQuiz] = useState({ loading: true, entries: null });
  useEffect(() => {
    funApi.leaderboard().then((d) => setData({ loading: false, entries: d.entries })).catch(() => setData({ loading: false, entries: null }));
    funApi.quizLeaderboard().then((d) => setQuiz({ loading: false, entries: d.entries })).catch(() => setQuiz({ loading: false, entries: null }));
  }, []);

  function list(entries, emptyText, renderRight) {
    if (!entries || entries.length === 0) {
      return <div className="text-sm muted3" style={{ marginTop: 10 }}>{emptyText}</div>;
    }
    return (
      <div style={{ display: 'grid', gap: 6, marginTop: 12 }}>
        {entries.map((e) => (
          <div
            key={e.rank}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
              border: '1px solid var(--border, #e5e7eb)', borderRadius: 10,
              background: e.isMe ? 'var(--blue-soft, rgba(37,99,235,.12))' : 'transparent',
              fontWeight: e.isMe ? 700 : 500,
            }}
          >
            <span style={{ width: 28, fontWeight: 800 }}>
              {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
            </span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.name}{e.isMe ? ' (Aap)' : ''}
            </span>
            {renderRight(e)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🏆 Mission Streak Leaderboard</div>
        <div className="text-xs muted3" style={{ marginTop: 6 }}>Sab se zyada consecutive din check-in karne walon ki list (top 10).</div>
        {data.loading && <div style={{ marginTop: 10 }}><Spinner label="Leaderboard load ho raha…" /></div>}
        {!data.loading && list(data.entries, 'Abhi koi streak nahi — pehla aap banein! Roz mission complete karein.', (e) => (
          <span className="text-sm" style={{ fontWeight: 700 }}>🔥 {e.streak} din · {e.points} TTG</span>
        ))}
      </div>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🧠 Quiz Geniuses</div>
        <div className="text-xs muted3" style={{ marginTop: 6 }}>Quiz ke top scores (top 10).</div>
        {quiz.loading && <div style={{ marginTop: 10 }}><Spinner label="Quiz board load ho raha…" /></div>}
        {!quiz.loading && list(quiz.entries, 'Abhi kisi ne quiz khela nahi — pehla aap khelen!', (e) => (
          <span className="text-sm" style={{ fontWeight: 700 }}>{e.bestScore}/{5} · {e.plays} games</span>
        ))}
      </div>
    </div>
  );
}

// ================================ Page ======================================
export default function FunZone() {
  useMeta('Fun Zone — The Tech Guider 01', 'Roz Lucky Spin, Tech Quiz, Tech Fact of the Day, Weekly Poll aur Leaderboard — pure entertainment on The Tech Guider Hub.');
  const [ttg, setTtg] = useState(null);
  useEffect(() => {
    publicApi.pointsMe().then((d) => setTtg(d.points)).catch(() => setTtg(null));
    const onTTG = () => publicApi.pointsMe().then((d) => setTtg(d.points)).catch(() => {});
    window.addEventListener('ttg:updated', onTTG);
    return () => window.removeEventListener('ttg:updated', onTTG);
  }, []);

  return (
    <main className="container" style={{ paddingBottom: 40 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 28, margin: '18px 0 6px' }}>🎡 Fun Zone</h1>
        <p className="text-sm muted3">
          Roz ke entertainment games — Lucky Spin se TTG jeeto, quiz khelo, facts parho aur polls mein vote do.
          {ttg !== null && <> · Aap ka balance: <strong>{ttg} TTG</strong></>}
        </p>
      </header>

      <div style={{ display: 'grid', gap: 16 }}>
        <SpinWheel />
        <TechQuiz />
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <FactOfDay />
          <WeeklyPoll />
        </div>
        <Leaderboard />
      </div>
    </main>
  );
}

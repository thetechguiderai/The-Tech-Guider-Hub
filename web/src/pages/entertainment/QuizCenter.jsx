import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../../App';
import { ProgressBar, EntNav, LocalBadge, PageHeader } from '../../entertainment/shared';
import {
  buildDailyRound,
  buildRound,
  DAILY_QUIZ_SIZE,
  QUIZ_CATEGORIES,
  QUIZ_ROUND_SIZE,
  TOTAL_QUESTION_COUNT,
} from '../../content/quizzes';
import { localDateKey, recordQuiz, useEntStats } from '../../entertainment/storage';

const SECONDS = 20;

function outcomeText(percent) {
  if (percent === 100) return 'Perfect score! Aapka knowledge solid hai.';
  if (percent >= 80) return 'Zabardast! Bas thori si polish baqi hai.';
  if (percent >= 60) return 'Acha result — explanations parh kar aur behtar karein.';
  if (percent >= 40) return 'Theek hai — kuch concepts review karne honge.';
  return 'Koi baat nahi, explanations dekhein aur dobara koshish karein.';
}

export default function QuizCenter() {
  useMeta(
    'Quiz Center — The Tech Guider Hub',
    'Play verified technology, gaming and general knowledge quizzes with explanations and a daily challenge. No TTG rewards, just local XP and learning.'
  );

  const stats = useEntStats();
  const dateKey = localDateKey();
  const dailyQuestions = useMemo(() => buildDailyRound(dateKey, DAILY_QUIZ_SIZE), [dateKey]);

  const [view, setView] = useState('home');
  const [mode, setMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [result, setResult] = useState(null);
  const answerRef = useRef(null);

  function answer(option) {
    if (selected !== null) return;
    const q = questions[index];
    if (!q) return;
    const correct = option === q.answer;
    setSelected(option);
    setAnswers((prev) => [...prev, { id: q.id, chosen: option, correct, q }]);
    if (correct) setScore((s) => s + 1);
  }
  answerRef.current = answer;

  useEffect(() => {
    if (view !== 'play' || selected !== null) return undefined;
    if (timeLeft <= 0) {
      if (answerRef.current) answerRef.current(-1);
      return undefined;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [view, selected, timeLeft]);

  function start(nextMode) {
    const qs = nextMode.type === 'daily'
      ? buildDailyRound(localDateKey(), DAILY_QUIZ_SIZE)
      : buildRound(nextMode.id, QUIZ_ROUND_SIZE);
    if (!qs.length) return;
    setMode(nextMode);
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setTimeLeft(SECONDS);
    setResult(null);
    setView('play');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function finish() {
    const total = questions.length;
    const finalScore = score;
    const category = mode && mode.type === 'daily' ? 'daily' : mode ? mode.id : 'mixed';
    const record = recordQuiz({ score: finalScore, total, category, daily: mode && mode.type === 'daily' });
    setResult({
      score: finalScore,
      total,
      percent: total ? Math.round((finalScore / total) * 100) : 0,
      record,
    });
    setView('result');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setTimeLeft(SECONDS);
  }

  function leave() {
    if (view === 'play' && !window.confirm('Quiz chhorein? Is round ka score save nahi hoga.')) return;
    setView('home');
    setMode(null);
    setResult(null);
  }

  const activeCategory = mode ? QUIZ_CATEGORIES.find((c) => c.id === mode.id) : null;

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />

        {view === 'home' && (
          <>
            <PageHeader
              eyebrow="Quiz Center"
              title="Quizzes & Trivia"
              sub="Technology, gaming aur general knowledge ke verified sawal — har jawab ke sath explanation. Quiz se TTG nahi milta; sirf local XP aur seekhne ka maza."
              right={<LocalBadge>Local bests</LocalBadge>}
            />

            <section className="ent-daily-quiz">
              <div className="ent-daily-quiz-main">
                <div className="eyebrow">Daily quiz challenge</div>
                <h2 className="ent-card-title">Aaj ke {dailyQuestions.length} sawal</h2>
                <p className="ent-page-sub">
                  Aaj ki local date ({dateKey}) ke mutabiq fixed set — har device par same questions.
                  Har sawal ke liye {SECONDS} seconds.
                </p>
                <div className="ent-daily-quiz-meta">
                  <span className="ent-tag">8 questions</span>
                  <span className="ent-tag">Same for today</span>
                  <span className="ent-tag">Explanations included</span>
                </div>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => start({ type: 'daily' })}>
                Daily quiz shuru karein
              </button>
            </section>

            <section className="ent-section">
              <div className="ent-section-head">
                <div>
                  <h2 className="section-title">Choose a category</h2>
                  <p className="section-sub">
                    Har round {QUIZ_ROUND_SIZE} random questions ka hota hai. Total {TOTAL_QUESTION_COUNT} verified questions.
                  </p>
                </div>
              </div>
              <div className="ent-quiz-categories">
                {QUIZ_CATEGORIES.map((c) => {
                  const best = stats.quizBest[c.id] || 0;
                  return (
                    <div key={c.id} className="ent-quiz-category">
                      <span className="ent-quiz-emoji" aria-hidden="true">{c.emoji}</span>
                      <h3 className="ent-card-title">{c.title}</h3>
                      <p className="ent-page-sub">{c.desc}</p>
                      <div className="ent-quiz-meta-row">
                        <span className="ent-tag">{c.questions.length} questions</span>
                        <span className="ent-tag">Best: {best}/{QUIZ_ROUND_SIZE}</span>
                      </div>
                      <button type="button" className="btn btn-ghost btn-block" onClick={() => start({ type: 'category', id: c.id })}>
                        Start {c.title} quiz
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ent-crosslink">
              <div>
                <h2 className="ent-card-title">Quiz rules</h2>
                <p className="ent-page-sub">
                  Har sawal 20 seconds ka hai. Time khatam hone par sawal incorrect count hoga. Jawab dene ke baad sahi option
                  aur explanation dono dikhte hain. Daily quiz ka set local date se select hota hai.
                </p>
              </div>
              <Link to="/fun" className="btn btn-ghost">Fun Zone quizzes</Link>
            </section>

            <p className="ent-footnote">
              Quiz score local best ke tor par save hota hai. Ye TTG ya global leaderboard nahi hai. Sawal fixed hain aur
              explanations manually verify kiye gaye hain.
            </p>
          </>
        )}

        {view === 'play' && questions[index] && (
          <section className="ent-quiz-play" aria-label="Quiz round">
            <div className="ent-quiz-top">
              <button type="button" className="ent-back-link" onClick={leave}>← Quit round</button>
              <div className="ent-quiz-title">
                {mode && mode.type === 'daily' ? 'Daily quiz' : activeCategory ? activeCategory.title : 'Quiz'}
              </div>
              <div className="ent-quiz-position">
                Question {index + 1} / {questions.length}
              </div>
            </div>

            <div className="ent-quiz-progress">
              <ProgressBar value={((index + (selected !== null ? 1 : 0)) / questions.length) * 100} label="Quiz progress" />
              <div className="ent-quiz-progress-meta">
                <span>Score: {score}</span>
                <span className={timeLeft <= 5 && selected === null ? 'ent-danger-text' : 'ent-muted'}>
                  {selected === null ? `${timeLeft}s bache` : 'Jawab lock'}
                </span>
              </div>
            </div>

            <div className="ent-question-card">
              <div className="ent-question-meta">
                <span className="ent-tag">{questions[index].category || (mode && mode.id) || 'mixed'}</span>
                <span className={`ent-timer${timeLeft <= 5 && selected === null ? ' is-low' : ''}`}>
                  {selected === null ? `${timeLeft}s` : '—'}
                </span>
              </div>
              <h2 className="ent-question-text">{questions[index].q}</h2>

              <div className="ent-options">
                {questions[index].options.map((opt, i) => {
                  let tone = '';
                  if (selected !== null) {
                    if (i === questions[index].answer) tone = ' is-correct';
                    else if (i === selected) tone = ' is-wrong';
                    else tone = ' is-dim';
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`ent-option${tone}`}
                      onClick={() => answer(i)}
                      disabled={selected !== null}
                    >
                      <span className="ent-option-letter">{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                      {selected !== null && i === questions[index].answer && <span className="ent-option-mark">✓</span>}
                      {selected !== null && i === selected && i !== questions[index].answer && <span className="ent-option-mark">✕</span>}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div className="ent-explain" role="status">
                  <strong>
                    {selected === -1
                      ? 'Time up — koi jawab nahi diya.'
                      : selected === questions[index].answer
                        ? 'Sahi jawab!'
                        : 'Ghalat jawab.'}
                  </strong>
                  <p>{questions[index].explain}</p>
                  <button type="button" className="btn btn-primary" onClick={nextQuestion}>
                    {index + 1 >= questions.length ? 'Result dekhein' : 'Agla sawal'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {view === 'result' && result && (
          <section className="ent-quiz-result">
            <div className="ent-result-hero">
              <div className="ent-result-score">{result.score}<span>/{result.total}</span></div>
              <h1 className="ent-page-title">{result.percent}%</h1>
              <p className="ent-page-sub">{outcomeText(result.percent)}</p>
              <div className="ent-result-meta">
                <span className="ent-tag">Local best: {result.record ? result.record.best : result.score}/{result.total}</span>
                <span className="ent-tag">+{result.record ? result.record.xpGained : 0} XP added</span>
                {result.record && result.record.dailyCompleted && (
                  <span className="ent-tag">Daily challenge ✓</span>
                )}
              </div>
              <div className="ent-hero-actions ent-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => start(mode && mode.type === 'daily' ? { type: 'daily' } : { type: 'category', id: mode ? mode.id : 'tech' })}
                >
                  Dobara khelein
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setView('home'); setResult(null); }}>
                  Doosri category
                </button>
              </div>
            </div>

            <div className="ent-review">
              <h2 className="section-title">Answer review</h2>
              <p className="section-sub">Har sawal ki explanation — ghalati se seekhne ke liye.</p>
              {answers.map((a, i) => (
                <details key={`${a.id}-${i}`} className={`ent-review-item${a.correct ? ' is-correct' : ' is-wrong'}`}>
                  <summary>
                    <span className="ent-review-index">{i + 1}</span>
                    <span className="ent-review-q">{a.q.q}</span>
                    <span className="ent-review-mark">{a.correct ? '✓' : '✕'}</span>
                  </summary>
                  <div className="ent-review-body">
                    <p>
                      <strong>Aapka jawab:</strong>{' '}
                      {a.chosen === -1 ? 'Koi jawab nahi (time out)' : a.q.options[a.chosen]}
                    </p>
                    <p><strong>Sahi jawab:</strong> {a.q.options[a.q.answer]}</p>
                    <p className="ent-muted">{a.q.explain}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

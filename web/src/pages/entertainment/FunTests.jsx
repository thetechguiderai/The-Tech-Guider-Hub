import React, { useMemo, useRef, useState } from 'react';
import { useMeta } from '../../App';
import { EntNav, LocalBadge, PageHeader } from '../../entertainment/shared';
import { localDateKey, recordActivity, recordChoice, useEntStats } from '../../entertainment/storage';

const WYR = [
  { id: 'w1', a: 'Hamesha sirf WiFi ho, mobile data kabhi nahi', b: 'Hamesha sirf mobile data ho, WiFi kabhi nahi' },
  { id: 'w2', a: 'Ek saal tak naya phone na mile', b: 'Ek saal tak internet na mile' },
  { id: 'w3', a: 'Har bug khud fix ho jaye', b: 'Har feature pehli koshish mein ban jaye' },
  { id: 'w4', a: 'Raat ko late coding', b: 'Subah jaldi coding' },
  { id: 'w5', a: 'Sirf keyboard se computer chalayein', b: 'Sirf mouse se computer chalayein' },
  { id: 'w6', a: 'Ek perfect AI assistant', b: 'Perfect photographic memory' },
  { id: 'w7', a: 'Gaming mein pro banein', b: 'Coding mein pro banein' },
  { id: 'w8', a: 'YouTube par ads kabhi na aayein', b: 'Gaming mein lag kabhi na ho' },
  { id: 'w9', a: 'Purani classic games', b: 'Nayi high-end games' },
  { id: 'w10', a: 'Apna khud ka game banayein', b: 'Apni khud ki website banayein' },
];

const THIS_OR_THAT = [
  { id: 't1', a: 'Keyboard', b: 'Mouse' },
  { id: 't2', a: 'Android', b: 'iOS' },
  { id: 't3', a: 'PC', b: 'Console' },
  { id: 't4', a: 'YouTube', b: 'Netflix' },
  { id: 't5', a: 'Chai', b: 'Coffee' },
  { id: 't6', a: 'Dark mode', b: 'Light mode' },
  { id: 't7', a: 'Single player', b: 'Multiplayer' },
  { id: 't8', a: 'Laptop', b: 'Desktop' },
  { id: 't9', a: 'Early bird', b: 'Night owl' },
  { id: 't10', a: 'Google', b: 'Bing' },
];

const TYPES = {
  strategist: {
    title: 'The Strategist',
    emoji: '🧠',
    desc: 'Aap pehle plan banate hain, phir kaam karte hain. Aapko systems, rules aur efficient solutions pasand hain.',
  },
  explorer: {
    title: 'The Explorer',
    emoji: '🧭',
    desc: 'Aap nayi cheezein try karne se nahi darte. Curiosity aapki sab se badi strength hai.',
  },
  competitor: {
    title: 'The Competitor',
    emoji: '🏆',
    desc: 'Aapko challenge aur improvement pasand hai. Leaderboard aapko naturally attract karta hai.',
  },
  creator: {
    title: 'The Creator',
    emoji: '🎨',
    desc: 'Aap cheezon ko apne tareeqe se banana chahte hain — design, code ya content, creation aapki drive hai.',
  },
};

const PERSONALITY = [
  {
    id: 'p1',
    q: 'Free time mila to sab se pehle kya karte hain?',
    options: [
      { label: 'Koi naya project plan karta hoon', type: 'strategist' },
      { label: 'Nayi game ya tool explore karta hoon', type: 'explorer' },
      { label: 'Ranked match khelta hoon', type: 'competitor' },
      { label: 'Kuch design ya likhna shuru karta hoon', type: 'creator' },
    ],
  },
  {
    id: 'p2',
    q: 'Team project mein aapka natural role kya hota hai?',
    options: [
      { label: 'Plan aur deadlines set karna', type: 'strategist' },
      { label: 'Naye ideas aur resources dhoondna', type: 'explorer' },
      { label: 'Team ko aage badhne par focus karna', type: 'competitor' },
      { label: 'Visuals aur presentation banana', type: 'creator' },
    ],
  },
  {
    id: 'p3',
    q: 'Game mein aapko sab se zyada kya pasand hai?',
    options: [
      { label: 'Strategy aur planning', type: 'strategist' },
      { label: 'Exploration aur secrets', type: 'explorer' },
      { label: 'Competition aur winning', type: 'competitor' },
      { label: 'Sandbox mein kuch banana', type: 'creator' },
    ],
  },
  {
    id: 'p4',
    q: 'Naya tech launch ho to aap kya karte hain?',
    options: [
      { label: 'Specs aur reviews compare karta hoon', type: 'strategist' },
      { label: 'Foran try karna chahta hoon', type: 'explorer' },
      { label: 'Benchmarks aur competition dekhta hoon', type: 'competitor' },
      { label: 'Us se kuch naya banata hoon', type: 'creator' },
    ],
  },
  {
    id: 'p5',
    q: 'Mushkil problem aa jaye to?',
    options: [
      { label: 'Step by step break down karta hoon', type: 'strategist' },
      { label: 'Different approaches experiment karta hoon', type: 'explorer' },
      { label: 'Sab se pehle fix karke prove karta hoon', type: 'competitor' },
      { label: 'Bilkul naya alternative sochta hoon', type: 'creator' },
    ],
  },
  {
    id: 'p6',
    q: 'Kaunsa content sab se zyada dekhte hain?',
    options: [
      { label: 'Deep tutorials aur guides', type: 'strategist' },
      { label: 'Tech news aur discoveries', type: 'explorer' },
      { label: 'Esports aur tournaments', type: 'competitor' },
      { label: 'Design aur creative showcases', type: 'creator' },
    ],
  },
  {
    id: 'p7',
    q: 'Aapke liye sab se acha achievement kya hai?',
    options: [
      { label: 'Ek perfect plan jo kaam kar jaye', type: 'strategist' },
      { label: 'Koi chhupa hua secret discover karna', type: 'explorer' },
      { label: 'Top rank par pohanchna', type: 'competitor' },
      { label: 'Apna creative project mukammal karna', type: 'creator' },
    ],
  },
  {
    id: 'p8',
    q: 'Aap sab se behtar kaise seekhte hain?',
    options: [
      { label: 'Documentation aur structured courses se', type: 'strategist' },
      { label: 'Trial and error se', type: 'explorer' },
      { label: 'Competition aur challenges se', type: 'competitor' },
      { label: 'Banate hue, hands-on', type: 'creator' },
    ],
  },
];

const BRAIN_TEASERS = [
  {
    q: 'Mere paas cities hain lekin ghar nahi, rivers hain lekin paani nahi, forests hain lekin darakht nahi. Main kya hoon?',
    a: 'Map (naksha)',
    e: 'Map par cities, rivers aur forests draw hote hain — asal cheezein nahi hoti.',
  },
  {
    q: 'Jitni zyada ho, utna kam dikhta hai. Kya cheez hai?',
    a: 'Andhera',
    e: 'Andhera barhne par roshni aur cheezein kam nazar aati hain.',
  },
  {
    q: 'Bina munh ke bolti hoon, bina kaan ke sunti hoon. Main kya hoon?',
    a: 'Echo (goonj)',
    e: 'Echo aapki awaaz ko wapas lautati hai — bina munh ya kaan ke.',
  },
  {
    q: 'Jo cheez jitni zyada dry hoti hai, utni zyada wet ho jati hai?',
    a: 'Towel',
    e: 'Towel paani soak karta hai, is liye dry karne ke baad khud wet hota hai.',
  },
  {
    q: 'Jis ka sar aur dum hai lekin jism nahi — kya?',
    a: 'Coin (sikka)',
    e: 'Coin ke dono side ko head aur tail kaha jata hai, body nahi hoti.',
  },
  {
    q: 'Duniya ka safar kar sakti hai lekin ek kone mein rehti hai. Kya?',
    a: 'Stamp (ticket)',
    e: 'Postage stamp envelope ke kone par hota hai lekin envelope duniya bhar jata hai.',
  },
  {
    q: 'Haath hain lekin taali nahi baja sakta. Kya?',
    a: 'Clock (ghari)',
    e: 'Clock ke hands (suiyan) hote hain, clap nahi kar sakta.',
  },
  {
    q: 'Istemaal se pehle isay todna padta hai. Kya?',
    a: 'Egg (anda)',
    e: 'Anda kholne/todne ke baad hi pakaya ya use kiya jata hai.',
  },
  {
    q: 'Jo upar jata hai lekin kabhi wapas neeche nahi aata?',
    a: 'Age (umar)',
    e: 'Umar sirf barhti hai, wapas nahi aati.',
  },
  {
    q: 'Agar aap ek race mein doosre number wale ko cross kar jaayein to aap kis number par honge?',
    a: 'Doosre number par',
    e: 'Doosre number wale ko cross karne ka matlab hai ke aap uski jagah le rahe hain — is liye aap doosre par honge.',
  },
];

const FACTS = [
  'Octopus ke teen dil hote hain aur uska khoon blue hota hai.',
  'Venus par ek din uske ek saal se lamba hota hai — ye apne axis par bohat aahista ghoomta hai.',
  'Keela (banana) botanically berry hai, jabke strawberry nahi.',
  'Sharks trees se pehle zameen par maujood thay.',
  'Sooraj ki roshni zameen tak pohanchne mein taqreeban 8 minute 20 second leti hai.',
  'Vacuum mein awaaz travel nahi kar sakti — is liye space mein silence hota hai.',
  'Duniya ka pehla computer "bug" asal mein ek moth thi, 1947 mein Harvard Mark II par.',
  '"Wi-Fi" kisi phrase ka short form nahi — ye sirf ek brand name hai.',
  'Ek group of flamingos ko "flamboyance" kaha jata hai.',
  'i aur j ke upar wale dot ko "tittle" kaha jata hai.',
];

function dailyTeaser() {
  const key = localDateKey();
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return BRAIN_TEASERS[h % BRAIN_TEASERS.length];
}

function PairGame({ title, pairs, prefix, note }) {
  const stats = useEntStats();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const pair = pairs[index % pairs.length];
  const counts = stats.choices[`${prefix}-${pair.id}`] || [0, 0];

  function choose(i) {
    if (picked !== null) return;
    setPicked(i);
    recordChoice(`${prefix}-${pair.id}`, i, 2);
  }

  function next() {
    setPicked(null);
    setIndex((v) => (v + 1) % pairs.length);
  }

  return (
    <section className="ent-panel ent-pair-game">
      <div className="ent-pair-head">
        <div>
          <div className="eyebrow">Quick pick</div>
          <h2 className="ent-card-title">{title}</h2>
        </div>
        <span className="ent-tag">{index + 1} / {pairs.length}</span>
      </div>
      <p className="ent-page-sub">{note}</p>

      <div className="ent-pair-options">
        <button
          type="button"
          className={`ent-pair-btn${picked === 0 ? ' is-picked' : ''}${picked !== null && picked !== 0 ? ' is-dim' : ''}`}
          onClick={() => choose(0)}
          disabled={picked !== null}
        >
          <span className="ent-pair-letter">A</span>
          <span>{pair.a}</span>
        </button>
        <span className="ent-pair-or">ya</span>
        <button
          type="button"
          className={`ent-pair-btn${picked === 1 ? ' is-picked' : ''}${picked !== null && picked !== 1 ? ' is-dim' : ''}`}
          onClick={() => choose(1)}
          disabled={picked !== null}
        >
          <span className="ent-pair-letter">B</span>
          <span>{pair.b}</span>
        </button>
      </div>

      {picked !== null && (
        <div className="ent-pair-result">
          <p className="ent-success-note">Pick local history mein save ho gaya.</p>
          <div className="ent-pair-tally">
            <span>A: <strong>{counts[0] || 0}</strong> picks</span>
            <span>B: <strong>{counts[1] || 0}</strong> picks</span>
            <span className="ent-muted">Sirf aapke is device ke choices</span>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={next}>Agla sawal</button>
        </div>
      )}
    </section>
  );
}

function PersonalityTest() {
  const [answers, setAnswers] = useState([]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [reported, setReported] = useState(false);
  const answeredRef = useRef(-1);

  const current = PERSONALITY[index];

  function choose(type) {
    if (answeredRef.current === index) return;
    answeredRef.current = index;
    const nextAnswers = [...answers, type];
    setAnswers(nextAnswers);
    if (index + 1 >= PERSONALITY.length) {
      const counts = { strategist: 0, explorer: 0, competitor: 0, creator: 0 };
      nextAnswers.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
      const winner = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      setResult({ winner, counts });
      if (!reported) {
        setReported(true);
        recordActivity('test', { counter: 'tests', xp: 15 });
      }
    } else {
      setIndex((i) => i + 1);
    }
  }

  function restart() {
    answeredRef.current = -1;
    setAnswers([]);
    setIndex(0);
    setResult(null);
    setReported(false);
  }

  if (result) {
    const type = TYPES[result.winner];
    return (
      <section className="ent-panel ent-personality">
        <div className="eyebrow">Entertainment result</div>
        <div className="ent-personality-hero">
          <span className="ent-personality-emoji" aria-hidden="true">{type.emoji}</span>
          <div>
            <h2 className="ent-page-title">{type.title}</h2>
            <p className="ent-page-sub">{type.desc}</p>
          </div>
        </div>
        <div className="ent-personality-bars">
          {Object.entries(TYPES).map(([key, t]) => {
            const value = result.counts[key] || 0;
            const pct = Math.round((value / PERSONALITY.length) * 100);
            return (
              <div key={key} className="ent-personality-bar">
                <span>{t.emoji} {t.title}</span>
                <div className="ent-progress"><span style={{ width: `${pct}%` }} /></div>
                <span className="ent-muted">{value}/{PERSONALITY.length}</span>
              </div>
            );
          })}
        </div>
        <p className="ent-footnote">
          Ye sirf entertainment ke liye hai — koi scientific ya psychological assessment nahi. Result aapke jawabon ka
          simple tally hai.
        </p>
        <button type="button" className="btn btn-primary" onClick={restart}>Dobara test karein</button>
      </section>
    );
  }

  return (
    <section className="ent-panel ent-personality">
      <div className="ent-personality-top">
        <div>
          <div className="eyebrow">Gaming & tech personality</div>
          <h2 className="ent-card-title">Aap kaunse player type hain?</h2>
        </div>
        <span className="ent-tag">Question {index + 1} / {PERSONALITY.length}</span>
      </div>
      <div className="ent-quiz-progress">
        <div className="ent-progress"><span style={{ width: `${(index / PERSONALITY.length) * 100}%` }} /></div>
      </div>
      <h3 className="ent-personality-q">{current.q}</h3>
      <div className="ent-personality-options">
        {current.options.map((opt) => (
          <button key={opt.label} type="button" className="ent-personality-option" onClick={() => choose(opt.type)}>
            {opt.label}
          </button>
        ))}
      </div>
      <p className="ent-hint">8 sawal · koi timer nahi · result local tally hai, scientific test nahi.</p>
    </section>
  );
}

export default function FunTests() {
  useMeta(
    'Fun Tests — The Tech Guider Hub',
    'Would You Rather, This or That, a gaming personality quiz, daily brain teasers and real tech facts. Entertainment only, no scientific claims.'
  );

  const stats = useEntStats();
  const [tab, setTab] = useState('wyr');
  const [revealed, setRevealed] = useState(false);
  const [factIndex, setFactIndex] = useState(0);
  const teaser = useMemo(() => dailyTeaser(), []);

  return (
    <div className="ent-page">
      <div className="container">
        <EntNav />
        <PageHeader
          eyebrow="Fun & Personality"
          title="Fun Tests"
          sub="Chhote interactive breaks: choices, ek entertainment personality test, daily brain teaser aur real facts. Yahan koi scientific ya psychological claim nahi."
          right={<LocalBadge>Local choices</LocalBadge>}
        />

        <div className="ent-tabs" role="tablist" aria-label="Fun test modes">
          <button type="button" role="tab" aria-selected={tab === 'wyr'} className={`ent-tab${tab === 'wyr' ? ' active' : ''}`} onClick={() => setTab('wyr')}>
            Would You Rather
          </button>
          <button type="button" role="tab" aria-selected={tab === 'tot'} className={`ent-tab${tab === 'tot' ? ' active' : ''}`} onClick={() => setTab('tot')}>
            This or That
          </button>
          <button type="button" role="tab" aria-selected={tab === 'personality'} className={`ent-tab${tab === 'personality' ? ' active' : ''}`} onClick={() => setTab('personality')}>
            Personality Test
          </button>
        </div>

        {tab === 'wyr' && (
          <PairGame
            title="Would You Rather?"
            pairs={WYR}
            prefix="wyr"
            note="Do options mein se ek chunein. Tallies sirf aapke is browser mein save hoti hain — ye global voting nahi hai."
          />
        )}

        {tab === 'tot' && (
          <PairGame
            title="This or That"
            pairs={THIS_OR_THAT}
            prefix="tot"
            note="Fauran apna favourite chunein. Har pick aapke device par local tally mein add hota hai."
          />
        )}

        {tab === 'personality' && <PersonalityTest />}

        <section className="ent-two-col ent-mt">
          <div className="ent-panel">
            <div className="eyebrow">Daily brain teaser</div>
            <h2 className="ent-card-title">Aaj ka teaser</h2>
            <p className="ent-teaser-q">{teaser.q}</p>
            {!revealed ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setRevealed(true)}>
                Jawab dekhein
              </button>
            ) : (
              <div className="ent-teaser-a" role="status">
                <strong>{teaser.a}</strong>
                <p>{teaser.e}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevealed(false)}>Chhupayein</button>
              </div>
            )}
            <p className="ent-hint">Teaser local date ({localDateKey()}) ke hisab se change hota hai.</p>
          </div>

          <div className="ent-panel">
            <div className="eyebrow">Random fact</div>
            <h2 className="ent-card-title">Interesting fact</h2>
            <p className="ent-teaser-q">{FACTS[factIndex]}</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setFactIndex((i) => (i + 1) % FACTS.length)}
            >
              Naya fact
            </button>
            <p className="ent-hint">Ye general knowledge facts hain — entertainment content ke tor par diye gaye hain.</p>
          </div>
        </section>

        <p className="ent-footnote">
          Choices aur test results local hain. Hum inhein verified statistics, psychology results ya global votes ke tor par
          pesh nahi karte. Aapka test count: {stats.counters.tests || 0} local completions.
        </p>
      </div>
    </div>
  );
}

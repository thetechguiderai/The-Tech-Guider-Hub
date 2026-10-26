import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const ENT_LINKS = [
  { to: '/entertainment', label: 'Overview', end: true },
  { to: '/entertainment/games', label: 'Games' },
  { to: '/entertainment/quizzes', label: 'Quizzes' },
  { to: '/entertainment/memes', label: 'Meme Lab' },
  { to: '/entertainment/fun', label: 'Fun Tests' },
  { to: '/entertainment/chill', label: 'Chill' },
  { to: '/entertainment/achievements', label: 'Achievements' },
];

export function EntNav() {
  return (
    <nav className="ent-subnav" aria-label="Entertainment sections">
      {ENT_LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => `ent-subnav-link${isActive ? ' active' : ''}`}
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function LocalBadge({ children = 'Local only' }) {
  return (
    <span className="ent-local-badge" title="Ye progress sirf is device ke browser mein save hoti hai">
      <span aria-hidden="true">●</span> {children}
    </span>
  );
}

export function ProgressBar({ value = 0, label, tone = 'default' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`ent-progress${tone === 'accent' ? ' is-accent' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatPill({ label, value, hint }) {
  return (
    <div className="ent-stat">
      <span className="ent-stat-label">{label}</span>
      <strong className="ent-stat-value">{value}</strong>
      {hint && <span className="ent-stat-hint">{hint}</span>}
    </div>
  );
}

export function ModuleCard({ to, emoji, title, desc, meta, tint = 'gray' }) {
  return (
    <Link to={to} className={`ent-module ent-tint-${tint}`}>
      <span className="ent-module-icon" aria-hidden="true">{emoji}</span>
      <span className="ent-module-body">
        <span className="ent-module-title">{title}</span>
        <span className="ent-module-desc">{desc}</span>
        {meta && <span className="ent-module-meta">{meta}</span>}
      </span>
      <span className="ent-module-arrow" aria-hidden="true">→</span>
    </Link>
  );
}

export function PageHeader({ eyebrow, title, sub, right }) {
  return (
    <header className="ent-page-head">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="ent-page-title">{title}</h1>
        {sub && <p className="ent-page-sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

import React from 'react';

/* ---------------- icons ---------------- */
function Svg({ children, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  home: (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Svg>,
  video: (p) => <Svg {...p}><rect x="2.5" y="5" width="19" height="14" rx="3" /><polygon points="10 9.5 15 12 10 14.5" fill="currentColor" stroke="none" /></Svg>,
  resource: (p) => <Svg {...p}><path d="M3 7l3-3 15 13-3 3z" /><path d="M8 12l3 3" /><path d="M12 4l3 3" /></Svg>,
  tool: (p) => <Svg {...p}><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /><path d="M14 3h4a3 3 0 0 1 3 3v2" /><path d="M10 21H7a3 3 0 0 1-3-3v-2" /></Svg>,
  minecraft: (p) => <Svg {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M3 12h18" /><path d="M8 8V5h8v3" /></Svg>,
  ai: (p) => <Svg {...p}><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2.2 2.2M17.2 17.2l2.2 2.2M19.4 4.6l-2.2 2.2M6.8 17.2l-2.2 2.2" /></Svg>,
  youtube: (p) => <Svg {...p}><path d="M22 12s0-3.4-.4-5c-.2-.9-.9-1.6-1.8-1.8C18.2 4.8 12 4.8 12 4.8s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8-.4 1.6-.4 5-.4 5s0 3.4.4 5c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-5 .4-5z" /><polygon points="10,9.5 15,12 10,14.5" fill="currentColor" stroke="none" /></Svg>,
  discord: (p) => <Svg {...p}><path d="M8 7.5c-2.9 1.8-4.7 5.2-4.5 9 1.8 2 4.5 3 4.5 3l1.5-2.6c.9.4 2.8.4 3.7 0 .7.9 1.6 1.8 1.6 2.6 2-.4 4.7-1.5 6.5-3.5.1-3.6-1.7-7-4.5-8.6-1 .7-2 1-2 1-1.4-1.3-3-2.1-3.8-3.1-.5-.5-.5-1.2-.5-1.2s3.3.3 5.5 3.6" /></Svg>,
  instagram: (p) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" /></Svg>,
  tiktok: (p) => <Svg {...p}><path d="M14 3v11.5a4 4 0 1 1-4-4" /><path d="M14 3c.4 3 2.5 5 5.5 5.5V12c-2 0-3.8-.7-5.5-1.9" /></Svg>,
  x: (p) => <Svg {...p}><path d="M4 4l16 16M20 4L4 20" /></Svg>,
  globe: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" /></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></Svg>,
  menu: (p) => <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>,
  close: (p) => <Svg {...p}><path d="M5 5l14 14M19 5 5 19" /></Svg>,
  chart: (p) => <Svg {...p}><path d="M4 20h16" /><path d="M6 16v-4M12 16V7M18 16v-7" /></Svg>,
  settings: (p) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" /></Svg>,
  alert: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.5v.01" /></Svg>,
  list: (p) => <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2.4" /></Svg>,
  lock: (p) => <Svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>,
  shield: (p) => <Svg {...p}><path d="M12 3l7 3v6c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6z" /><path d="M9.5 12l2 2 3.5-4" /></Svg>,
  profile: (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></Svg>,
  check: (p) => <Svg {...p}><path d="M5 12.5 10 17.5 19 6.5" /></Svg>,
  arrow: (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  plus: (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  edit: (p) => <Svg {...p}><path d="M4 20h16" /><path d="M5 16l9.5-9.5 3 3L8 19H5z" /></Svg>,
  trash: (p) => <Svg {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></Svg>,
  refresh: (p) => <Svg {...p}><path d="M20 11a8 8 0 1 0-2.5 6.5M20 4v7h-7" /></Svg>,
  download: (p) => <Svg {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></Svg>,
  copy: (p) => <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></Svg>,
  logout: (p) => <Svg {...p}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M15 17l5-5-5-5M20 12H9" /></Svg>,
  chevronDown: (p) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>,
  dot: (p) => <Svg {...p}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></Svg>,
  link: (p) => <Svg {...p}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></Svg>,
  eye: (p) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Svg>,
  star: (p) => <Svg {...p}><path d="m12 3 2.7 5.6 6.3.8-4.6 4.2 1.2 6.1L12 16.9 6.4 19.7l1.2-6.1L3 9.4l6.3-.8z" /></Svg>,
  grid: (p) => <Svg {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></Svg>,
  gift: (p) => <Svg {...p}><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 9h18M12 9v12" /><path d="M12 9c-1.5-.5-5.5-1-5.5-3.2C6.5 4.3 8 3 9.7 3.4 11.5 3.8 12 7 12 9z" /><path d="M12 9c1.5-.5 5.5-1 5.5-3.2C17.5 4.3 16 3 14.3 3.4 12.5 3.8 12 7 12 9z" /></Svg>,
};

/* ---------------- shared components ---------------- */
export function Spinner({ label }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label || 'Loading…'}</span>
    </div>
  );
}

export function EmptyState({ title, desc, action }) {
  return (
    <div className="state state-animate">
      <div className="state-icon">
        <Icon.grid size={22} />
      </div>
      <div className="state-title">{title}</div>
      {desc && <p className="state-desc">{desc}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, desc, retry }) {
  return (
    <div className="state state-animate" role="alert">
      <div className="state-icon" style={{ color: 'var(--danger)' }}>
        <Icon.alert size={22} />
      </div>
      <div className="state-title">{title || 'Something went wrong'}</div>
      {desc && <p className="state-desc">{desc}</p>}
      {retry && (
        <button className="btn btn-ghost btn-sm" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'gray' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function SectionHead({ eyebrow, title, sub, right }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function formatNum(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

export function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function dateLabel(iso) {
  if (!iso) return 'TBA';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function useApiState() {
  return React.useState({ loading: false, data: null, error: null });
}

export async function loadInto(set, fn, tracking) {
  set({ loading: true, data: null, error: null });
  try {
    const data = await fn();
    if (tracking && typeof tracking === 'function') tracking();
    set({ loading: false, data, error: null });
    return data;
  } catch (err) {
    set({ loading: false, data: null, error: err.message || 'Unable to load data.' });
    return null;
  }
}

export function MiniBarChart({ data, height = 120 }) {
  const max = Math.max(1, ...data.map((d) => d.count || 0));
  return (
    <div>
      <div className="bar-chart" style={{ height }} aria-hidden="true">
        {data.map((d) => (
          <div
            key={d.day || d.label}
            className="bar"
            title={`${d.day || d.label}: ${d.count}`}
            style={{ height: `${Math.max(2, ((d.count || 0) / max) * 100)}%` }}
          />
        ))}
      </div>
      {data.length > 0 && (
        <div className="chart-caption">
          <span>{data[0].day || data[0].label || ''}</span>
          <span>{data[data.length - 1].day || 'today'}</span>
        </div>
      )}
    </div>
  );
}
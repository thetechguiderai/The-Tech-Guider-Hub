import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, MiniBarChart, timeAgo, formatNum, Icon } from '../../components/ui';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Stat({ n, l }) {
  return (
    <div className="stat-tile">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

const QUICK = [
  { to: '/owner/dashboard/videos?new=1', label: 'Add video', icon: Icon.video },
  { to: '/owner/dashboard/resources?new=1', label: 'Add resource', icon: Icon.resource },
  { to: '/owner/dashboard/announcements?new=1', label: 'Announcement', icon: Icon.alert },
  { to: '/owner/dashboard/rewards?new=1', label: 'Add reward', icon: Icon.star },
  { to: '/owner/dashboard/youtube', label: 'YouTube', icon: Icon.chart },
  { to: '/owner/dashboard/audit', label: 'Audit logs', icon: Icon.list },
];

export default function Overview() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    (async () => {
      try {
        const data = await ownerApi.overview();
        setState({ loading: false, data, error: null });
      } catch {
        setState({ loading: false, data: null, error: 'Unable to load the dashboard overview.' });
      }
    })();
  }, []);

  if (state.loading) return <Spinner label="Loading overview…" />;
  if (state.error) return <ErrorState title="Overview unavailable" desc={state.error} />;

  const c = state.data.counts;

  return (
    <div>
      <div className="quick-actions" aria-label="Quick actions">
        {QUICK.map((q) => {
          const C = q.icon;
          return (
            <Link key={q.label} to={q.to} className="quick-action">
              <C size={15} /> {q.label}
            </Link>
          );
        })}
      </div>

      <div className="dash-cards">
        <Stat n={c.resources} l="Total resources" />
        <Stat n={c.videos} l="Total videos" />
        <Stat n={c.comingSoon} l="Coming soon videos" />
        <Stat n={c.resourceClicks} l="Resource clicks" />
        <Stat n={c.youtubeStatsAvailable ? formatNum(c.youtubeSubscribers) : '—'} l="YouTube subscribers" />
        <Stat n={c.minecraftListings} l="Minecraft listings" />
        <Stat n={c.rewardInventory} l="Reward inventory" />
        <Stat n={c.announcements} l="Active announcements" />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Page views — last 14 days</h3>
          {state.data.pageViews14.length > 0 ? (
            <MiniBarChart data={state.data.pageViews14} />
          ) : (
            <p className="text-sm muted3">No page views recorded yet.</p>
          )}
          <div className="flex align-center justify-between mt-2" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16 }}>Top resources</h3>
            <Link to="/owner/dashboard/analytics" className="visit-link text-sm">
              Analytics <Icon.arrow size={13} />
            </Link>
          </div>
          {state.data.topResources.length > 0 ? (
            state.data.topResources.map((r) => (
              <div className="list-row" key={r.name}>
                <span className="flex-1 minwidth-0 nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                <span className="mono text-sm muted">{r.clicks}</span>
              </div>
            ))
          ) : (
            <p className="text-sm muted3">No clicks yet.</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Recent activity</h3>
          {state.data.recent.length > 0 ? (
            state.data.recent.map((log) => (
              <div className="list-row" key={log.id}>
                <span
                  className="badge"
                  style={{ fontSize: 10.5 }}
                  data-tone={log.result}
                >
                  {log.result}
                </span>
                <span className="flex-1 minwidth-0 nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <span className="text-xs muted3 nowrap">{timeAgo(log.created_at + 'Z')}</span>
              </div>
            ))
          ) : (
            <p className="text-sm muted3">No activity recorded yet.</p>
          )}
          <div className="flex align-center justify-between mt-2" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 16 }}>Top search queries</h3>
          </div>
          {state.data.topSearch.length > 0 ? (
            state.data.topSearch.map((s) => (
              <div className="list-row" key={s.detail}>
                <span className="flex-1 minwidth-0 nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>“{s.detail}”</span>
                <span className="mono text-sm muted">{s.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm muted3">No searches yet.</p>
          )}
        </div>
      </div>

      {/* Recharts: real traffic from analytics_events (30 days) */}
      <div className="card mt-2" style={{ marginTop: 16 }}>
        <div className="flex align-center justify-between">
          <h3 style={{ fontSize: 16 }}>Traffic — last 30 days</h3>
          {c.youtubeStatsAvailable && (
            <span className="text-xs muted3">YouTube: {formatNum(c.youtubeViews)} views · {formatNum(c.youtubeVideoCount)} videos</span>
          )}
        </div>
        {state.data.trend30.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={state.data.trend30} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#ffffff14" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={{ stroke: '#26272b' }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                contentStyle={{ background: '#111419', border: '1px solid #26272b', borderRadius: 10, fontSize: 12.5, color: '#e5e7eb' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: 12.5 }} />
              <Line type="monotone" dataKey="pageviews" name="Page views" stroke="#e5e7eb" strokeWidth={2} dot={{ r: 2.5, fill: '#e5e7eb' }} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="clicks" name="Resource clicks" stroke="#6b7280" strokeWidth={2} dot={{ r: 2.5, fill: '#6b7280' }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm muted3">No traffic recorded yet.</p>
        )}
      </div>
    </div>
  );
}
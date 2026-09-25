import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, MiniBarChart, timeAgo, Icon } from '../../components/ui';

function Stat({ n, l }) {
  return (
    <div className="stat-tile">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

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
      <div className="dash-cards">
        <Stat n={c.resources} l="Total resources" />
        <Stat n={c.videos} l="Total videos" />
        <Stat n={c.comingSoon} l="Coming soon videos" />
        <Stat n={c.resourceClicks} l="Resource clicks" />
        <Stat n={c.youtubeVideoCount ?? '—'} l="YouTube videos" />
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
    </div>
  );
}
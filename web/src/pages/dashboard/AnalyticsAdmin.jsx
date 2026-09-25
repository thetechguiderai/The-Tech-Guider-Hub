import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, MiniBarChart, Badge, Icon } from '../../components/ui';

export default function AnalyticsAdmin() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [days, setDays] = useState(14);

  useEffect(() => {
    (async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const data = await ownerApi.analytics(days);
        setState({ loading: false, data, error: null });
      } catch {
        setState({ loading: false, data: null, error: 'Unable to load analytics.' });
      }
    })();
  }, [days]);

  if (state.loading) return <Spinner label="Loading analytics…" />;
  if (state.error) return <ErrorState title="Analytics unavailable" desc={state.error} />;

  const d = state.data;

  return (
    <div>
      <div className="flex align-center gap-2 mb-2">
        <span className="text-sm muted">Range:</span>
        {[7, 14, 30, 60].map((n) => (
          <button key={n} className={`chip${days === n ? ' on' : ''}`} onClick={() => setDays(n)}>{n}d</button>
        ))}
        <span className="text-xs muted3" style={{ marginLeft: 'auto' }}>
          {d.total} events in the last {d.days} days
        </span>
      </div>

      <div className="card mb-2" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Page views</h3>
        {d.views.length > 0 ? (
          <MiniBarChart data={d.views} />
        ) : (
          <p className="text-sm muted3">No page views recorded in this window.</p>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Event summary</h3>
          {d.clickSummary.length > 0 ? (
            d.clickSummary.map((e) => (
              <div className="list-row" key={e.event_type}>
                <span className="capitalize flex-1">{e.event_type.replace('_', ' ')}</span>
                <span className="mono text-sm muted">{e.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm muted3">No events yet.</p>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>Popular pages</h3>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {d.pages.length > 0 ? (
              d.pages.map((p) => (
                <div className="list-row" key={p.target || '/'}>
                  <span className="minwidth-0 flex-1 nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.target || '/'}</span>
                  <span className="mono text-sm muted">{p.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm muted3">No page data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-2" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Top resources & videos</h3>
        {d.topResources.length > 0 ? (
          d.topResources.map((r) => (
            <div className="list-row" key={r.detail}>
              <span className="minwidth-0 flex-1 nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.detail}</span>
              <span className="mono text-sm muted">{r.count}</span>
            </div>
          ))
        ) : (
          <p className="text-sm muted3">No clicks yet.</p>
        )}
        <h3 style={{ fontSize: 16, marginBottom: 8, marginTop: 16 }}>Top search queries</h3>
        {d.topSearch.length > 0 ? (
          d.topSearch.map((s) => (
            <div className="list-row" key={s.detail}>
              <span className="minwidth-0 flex-1 nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>“{s.detail}”</span>
              <span className="mono text-sm muted">{s.count}</span>
            </div>
          ))
        ) : (
          <p className="text-sm muted3">No searches yet.</p>
        )}
      </div>

      <p className="text-xs muted3 mt-1" style={{ marginTop: 16, maxWidth: 640 }}>
        Only anonymous counts are stored (browser IP is hashed, no personal or identifying visit data is kept).
      </p>
    </div>
  );
}
import React, { useEffect, useState, useMemo } from 'react';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { SectionHead, ErrorState, Spinner, EmptyState, Badge } from '../components/ui';
import { VideoCard } from '../components/cards';

export default function Videos() {
  useMeta('Videos — The Tech Guider Hub', 'All The Tech Guider videos and upcoming releases with their resources.');
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await publicApi.videos();
        setState({ loading: false, data: d.videos, error: null });
      } catch {
        setState({ loading: false, data: null, error: 'Unable to load videos right now.' });
      }
    })();
  }, []);

  const categories = useMemo(() => {
    if (!state.data) return ['all'];
    return ['all', ...new Set(state.data.map((v) => v.category || 'General'))];
  }, [state.data]);

  const filtered = useMemo(() => {
    let list = state.data || [];
    if (filter === 'coming_soon') list = list.filter((v) => v.status === 'coming_soon');
    else if (filter === 'published') list = list.filter((v) => v.status === 'published');
    else if (filter !== 'all') list = list.filter((v) => (v.category || 'General') === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) => v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.data, filter, query]);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <SectionHead
        eyebrow="Channel library"
        title="Videos"
        sub="Published videos and everything coming soon to The Tech Guider."
      />

      <div className="flex gap-2 flex-wrap align-center mb-2">
        <input
          className="input"
          style={{ maxWidth: 300, flex: 1, minWidth: 180 }}
          type="search"
          placeholder="Search videos…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search videos"
        />
        <div className="chip-select" aria-label="Filter videos">
          {categories.map((c) => (
            <button key={c} className={`chip${filter === c ? ' on' : ''}`} onClick={() => setFilter(c)}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
          <button className={`chip${filter === 'coming_soon' ? ' on' : ''}`} onClick={() => setFilter('coming_soon')}>
            Coming soon
          </button>
          <button className={`chip${filter === 'published' ? ' on' : ''}`} onClick={() => setFilter('published')}>
            Published
          </button>
        </div>
      </div>

      {state.loading && <Spinner label="Loading videos…" />}
      {state.error && <ErrorState title="Unable to load videos" desc={state.error} retry={() => window.location.reload()} />}

      {state.data && filtered.length === 0 && (
        <EmptyState
          title={query ? 'No videos match your search' : 'No videos yet'}
          desc="Videos added by the owner will appear here."
        />
      )}

      {state.data && filtered.length > 0 && (
        <div className="video-grid">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}

      {state.data && filter === 'coming_soon' && state.data.length > 0 && (
        <div className="mt-1 flex align-center gap-2" style={{ marginTop: 20 }}>
          <Badge tone="amber">Coming soon</Badge>
          <span className="text-xs muted">
            Release dates are planned targets and can change.
          </span>
        </div>
      )}
    </div>
  );
}
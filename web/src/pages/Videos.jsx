import React, { useEffect, useState, useMemo, useRef } from 'react';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { SectionHead, ErrorState, Spinner, EmptyState, Badge } from '../components/ui';
import { VideoCard } from '../components/cards';

function SkeletonCard() {
  return (
    <div className="video-card skeleton-card" aria-hidden="true">
      <div className="video-thumb-wrap">
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
      </div>
      <div className="video-body">
        <div className="skeleton" style={{ width: '80%', height: 16, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '50%', height: 12, borderRadius: 4, marginTop: 8 }} />
        <div className="skeleton" style={{ width: '90%', height: 12, borderRadius: 4, marginTop: 8 }} />
      </div>
    </div>
  );
}

export default function Videos() {
  useMeta('Videos — The Tech Guider 01', 'All The Tech Guider 01 videos and upcoming releases with their resources.');
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showContent, setShowContent] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const d = await publicApi.videos();
        if (mounted.current) {
          setState({ loading: false, data: d.videos, error: null });
          // Smooth transition: brief delay before showing real content
          setTimeout(() => mounted.current && setShowContent(true), 150);
        }
      } catch {
        if (mounted.current) {
          setState({ loading: false, data: null, error: 'Unable to load videos right now.' });
        }
      }
    })();
    return () => { mounted.current = false; };
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
        sub="Published videos and everything coming soon to The Tech Guider 01."
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

      {/* Loading: Skeleton cards with shimmer */}
      {state.loading && (
        <div className="video-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error: Clear message + retry */}
      {state.error && <ErrorState title="Unable to load videos" desc={state.error} retry={() => window.location.reload()} />}

      {/* Empty: Clean state when API returns no results */}
      {state.data && !state.error && filtered.length === 0 && !state.loading && (
        <EmptyState
          title={query ? 'No videos match your search' : 'NO VIDEOS AVAILABLE'}
          desc="Videos added by the owner or from YouTube will appear here."
        />
      )}

      {/* Success: Real data with fade-in transition */}
      {state.data && !state.error && filtered.length > 0 && !state.loading && (
        <div className={`video-grid${showContent ? ' content-visible' : ''}`}>
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
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { SectionHead, ErrorState, Spinner, EmptyState, Icon } from '../components/ui';
import { ResourceCard } from '../components/cards';

export default function Resources() {
  useMeta('Resources — The Tech Guider Hub', 'Resources used in The Tech Guider videos: hosting providers, tools, websites and links.');
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const [res, vids] = await Promise.all([publicApi.resources(), publicApi.videos()]);
        setVideos(vids.videos || []);
        setState({ loading: false, data: res.resources, error: null });
        const focus = params.get('focus');
        if (focus) {
          setCategory('All');
          setQuery('');
        }
      } catch (e) {
        setState({ loading: false, data: null, error: 'Unable to load resources right now.' });
      }
    })();
  }, []);

  const focusId = params.get('focus') ? Number(params.get('focus')) : null;

  const categories = useMemo(() => {
    if (!state.data) return [];
    return ['All', ...new Set(state.data.map((r) => r.category || 'General'))];
  }, [state.data]);

  const filtered = useMemo(() => {
    let list = state.data || [];
    if (category !== 'All') list = list.filter((r) => (r.category || 'General') === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.data, category, query]);

  const videoById = useMemo(() => Object.fromEntries(videos.map((v) => [v.id, v])), [videos]);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <SectionHead
        eyebrow="Resource library"
        title="Video Resources"
        sub="Every website, tool and link used in The Tech Guider videos — organised and easy to browse."
      />

      <div className="flex gap-2 flex-wrap align-center mb-2">
        <input
          className="input"
          style={{ maxWidth: 340, flex: 1, minWidth: 200 }}
          type="search"
          placeholder="Filter resources…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter resources"
        />
        <div className="chip-select" aria-label="Filter by category">
          {categories.map((c) => (
            <button key={c} className={`chip${category === c ? ' on' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {state.loading && <Spinner label="Loading resources…" />}
      {state.error && <ErrorState title="Unable to load resources" desc={state.error} retry={() => window.location.reload()} />}

      {state.data && filtered.length === 0 && (
        <EmptyState
          title="No resources here yet"
          desc="The owner hasn't added resources matching this filter."
        />
      )}

      {state.data && filtered.length > 0 && (
        <div>
          {category === 'All' && !query ? (
            groupsByCategory(filtered, focusId, videoById)
          ) : (
            <div className="grid-cards">
              {filtered.map((r) => (
                <ResourceCard key={r.id} resource={r} highlight={r.id === focusId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function groupsByCategory(resources, focusId, videoById) {
  const groups = {};
  for (const r of resources) {
    const cat = r.category || 'General';
    (groups[cat] = groups[cat] || []).push(r);
  }
  const order = Object.keys(groups).sort();
  return order.map((cat) => (
    <div key={cat} className="mb-2" style={{ marginBottom: 28 }}>
      <h3 className="text-sm" style={{ color: 'var(--text-3)', marginBottom: 12, fontSize: 12, fontWeight: 650, letterSpacing: '.1em', textTransform: 'uppercase' }}>
        {cat}
      </h3>
      <div className="grid-cards">
        {groups[cat].map((r) => (
          <ResourceCard key={r.id} resource={r} highlight={r.id === focusId} />
        ))}
      </div>
    </div>
  ));
}
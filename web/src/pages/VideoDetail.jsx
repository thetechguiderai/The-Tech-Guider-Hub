import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { Badge, Spinner, ErrorState, Icon } from '../components/ui';
import { ResourceCard } from '../components/cards';

export default function VideoDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, video: null, error: null });
  const [meta, setMeta] = useState({ title: 'Video — The Tech Guider Hub', desc: '' });

  useMeta(meta.title, meta.desc || undefined);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await publicApi.video(id);
        if (!alive) return;
        setState({ loading: false, video: v.video, error: null });
        setMeta({
          title: `${v.video.title} — The Tech Guider Hub`,
          desc: (v.video.description || '').slice(0, 160),
        });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, video: null, error: e.status === 404 ? 'not_found' : e.message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.loading) {
    return (
      <div className="container">
        <Spinner label="Loading video…" />
      </div>
    );
  }

  if (state.error === 'not_found') {
    return (
      <div className="container" style={{ padding: 60 }}>
        <ErrorState title="Video not found" desc="This video doesn't exist, or it's not public yet." />
        <div style={{ textAlign: 'center' }}>
          <Link to="/videos" className="btn btn-ghost">Back to videos</Link>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container" style={{ padding: 60 }}>
        <ErrorState title="Unable to load this video" desc={state.error} />
      </div>
    );
  }

  const v = state.video;
  const coming = v.status === 'coming_soon';
  const first = (v.resources || [])[0];

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 820 }}>
      <Link to="/videos" className="visit-link" style={{ marginBottom: 20, display: 'inline-flex' }}>
        <Icon.arrow size={15} style={{ transform: 'rotate(180deg)' }} /> Back to videos
      </Link>

      <div className="video-thumb-wrap" style={{ borderRadius: 'var(--radius-xl)', marginTop: 14 }}>
        {v.thumbnail ? (
          <img className="video-thumb" src={v.thumbnail} alt={`${v.title} thumbnail`} />
        ) : (
          <div className="video-thumb fallback" aria-hidden="true" style={{ aspectRatio: '16/9' }}>
            <span>{(v.title || 'TT').slice(0, 2).toUpperCase()}</span>
          </div>
        )}
        <div className="video-thumb-overlay">
          {coming ? <Badge tone="amber">Coming soon</Badge> : <Badge tone="blue">Published</Badge>}
        </div>
      </div>

      <div className="mt-2" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', letterSpacing: '-0.03em' }}>{v.title}</h1>
        <div className="flex gap-2 align-center flex-wrap" style={{ marginTop: 14 }}>
          <Badge tone="gray">{v.category || 'General'}</Badge>
          {coming && v.releaseDate && <Badge tone="amber">{v.releaseDate}</Badge>}
          {v.youtubeUrl ? (
            <a className="btn btn-accent btn-sm" href={v.youtubeUrl} target="_blank" rel="noopener noreferrer">
              <Icon.youtube size={15} /> Watch on YouTube
            </a>
          ) : null}
        </div>
        {v.description && (
          <p className="text-sm muted" style={{ marginTop: 16, fontSize: 15.5, lineHeight: 1.65 }}>
            {v.description}
          </p>
        )}
      </div>

      <div className="ht" style={{ height: 36 }} />

      <h2 style={{ fontSize: 22 }}>Resources Used In This Video</h2>
      {v.resources?.length > 0 ? (
        <div className="grid-cards mt-2">
          {v.resources.map((r) => (
            <ResourceCard key={r.id} resource={r} highlight={first?.id === r.id} />
          ))}
        </div>
      ) : (
        <div className="state mt-2">
          <div className="state-icon">
            <Icon.resource size={22} />
          </div>
          <div className="state-title">No resources listed for this video</div>
          <p className="state-desc">If resources were used in this video, the owner will add them here.</p>
        </div>
      )}
    </div>
  );
}
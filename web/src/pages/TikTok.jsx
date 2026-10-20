import React, { useCallback, useEffect, useState } from 'react';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { Icon, ErrorState, EmptyState, Spinner, SectionHead } from '../components/ui';
import { TikTokVideo, TikTokCreatorEmbed } from '../components/TikTokEmbed';

const FALLBACK_PROFILE = 'https://www.tiktok.com/@legend0.26';

/**
 * Dedicated TikTok page inside the Hub.
 * Real profile/video data from the official integration only, honest error +
 * empty states, official embeds, and a LIVE section that truthfully reports
 * that live status is unavailable where TikTok provides no authorized source.
 */
export default function TikTok() {
  useMeta(
    'TikTok — The Tech Guider Hub',
    'Official TikTok videos and profile of The Tech Guider, embedded directly in the Hub.'
  );

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [live, setLive] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);

  const load = useCallback(() => {
    setState({ loading: true, data: null, error: null });
    publicApi
      .tiktokProfile()
      .then((d) => setState({ loading: false, data: d, error: null }))
      .catch(() => setState({ loading: false, data: null, error: 'TikTok data could not be loaded right now.' }));
  }, []);

  const loadLive = useCallback(() => {
    setLiveLoading(true);
    publicApi
      .tiktokLive()
      .then((d) => { setLive(d); setLiveLoading(false); })
      .catch(() => {
        setLive({ status: 'unavailable', openUrl: `${FALLBACK_PROFILE}/live` });
        setLiveLoading(false);
      });
  }, []);

  useEffect(() => { load(); loadLive(); }, [load, loadLive]);

  const data = state.data;
  const profile = (data && data.profile) || {};
  const profileUrl = profile.profileUrl || FALLBACK_PROFILE;
  const videos = (data && Array.isArray(data.videos)) ? data.videos : [];
  const stats = profile.stats || null;

  function share() {
    const nav = navigator.share || null;
    if (nav && profileUrl) {
      nav({ title: 'The Tech Guider on TikTok', url: profileUrl }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl).catch(() => {});
    }
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      {/* ------------------------------ header ------------------------------ */}
      <section className="tt-hero">
        <div className="tt-hero-inner">
          <div className="tt-hero-main">
            {profile.avatar ? (
              <img className="tt-avatar tt-avatar-img" src={profile.avatar} alt="" width="64" height="64" />
            ) : (
              <span className="tt-avatar tt-avatar-lg" aria-hidden="true">
                {((profile.displayName || profile.handle || 'TG').replace(/[@\W_]/g, '').slice(0, 2).toUpperCase()) || 'TG'}
              </span>
            )}
            <div className="minwidth-0">
              <h1 className="tt-hero-title">
                {profile.displayName || 'The Tech Guider'}
              </h1>
              <a className="tt-hero-handle" href={profileUrl} target="_blank" rel="noopener noreferrer">
                {profileUrl.replace('https://', '')}
              </a>
              <div className="flex gap-2 align-center" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                {data && data.available && profile.statsSource === 'official_api' && (
                  <span className="badge badge-green">Data from the official TikTok API</span>
                )}
                {data && data.available && profile.statsSource === 'owner_reported' && (
                  <span className="badge badge-gray">Owner-reported profile figures</span>
                )}
              </div>
            </div>
          </div>
          <div className="tt-hero-actions">
            <a className="btn btn-blue" href={profileUrl} target="_blank" rel="noopener noreferrer">
              <Icon.tiktok size={16} /> Open Profile
            </a>
            <button type="button" className="btn btn-ghost" onClick={share}>
              <Icon.copy size={16} /> Share
            </button>
            <button type="button" className="btn btn-ghost" onClick={load} aria-label="Refresh TikTok data">
              <Icon.refresh size={16} /> Refresh
            </button>
          </div>
        </div>

        {stats && (
          <div className="tt-stats-row tt-stats-page">
            {stats.followers && <span><b>{stats.followers}</b> followers</span>}
            {stats.following && <span><b>{stats.following}</b> following</span>}
            {stats.likes && <span><b>{stats.likes}</b> likes</span>}
            {stats.views && <span><b>{stats.views}</b> views</span>}
          </div>
        )}
      </section>

      {/* ------------------------------ LIVE -------------------------------- */}
      <section className="sec-x">
        <SectionHead
          eyebrow="TikTok LIVE"
          title="Live stream"
          sub="Status comes from authorized data only — when no supported source is available, the Hub says so."
          right={
            <a className="btn btn-ghost btn-sm" href={`${live && live.openUrl || `${profileUrl}/live`}`} target="_blank" rel="noopener noreferrer">
              <Icon.eye size={14} /> Open TikTok LIVE
            </a>
          }
        />
        {liveLoading ? (
          <Spinner label="Checking live status…" />
        ) : (
          <div className="state tt-live-state">
            <div className="state-icon"><Icon.eye size={22} /></div>
            <div className="state-title">
              {(live && live.status === 'unavailable' && 'Live status unavailable') || 'Live status unavailable'}
            </div>
            <p className="state-desc">
              {(live && live.message) ||
                'TikTok does not provide an authorized public live-status endpoint for this integration, so the Hub cannot verify whether the creator is live right now. No fake indicator is shown.'}
            </p>
            <a className="btn btn-ghost btn-sm" href={`${(live && live.openUrl) || `${profileUrl}/live`}`} target="_blank" rel="noopener noreferrer">
              Check LIVE directly on TikTok <Icon.arrow size={14} />
            </a>
          </div>
        )}
      </section>

      {/* ----------------------------- videos ------------------------------- */}
      <section className="sec-x">
        <SectionHead
          eyebrow="Videos"
          title="Recent TikTok videos"
          sub="Official TikTok embeds — real posts only. Nothing is fabricated when the feed is empty."
          right={
            <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
              <Icon.refresh size={14} /> Refresh feed
            </button>
          }
        />

        {state.loading && (
          <div className="tt-skel-row" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="tt-skel-card" key={i}>
                <div className="skel skel-thumb" />
                <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                  <div className="skel" style={{ height: 13, width: '80%' }} />
                  <div className="skel" style={{ height: 11, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!state.loading && state.error && (
          <ErrorState title="Couldn't load the TikTok feed" desc={state.error} retry={load} />
        )}

        {!state.loading && !state.error && data && !data.available && (
          <>
            {/* Official creator-profile embed — works with no developer app. */}
            <TikTokCreatorEmbed profileUrl={profileUrl} handle={profile.handle || 'legend0.26'} />
            <EmptyState
              title="A dedicated feed isn't configured yet"
              desc="The widget above is TikTok's official creator embed. The Hub's own curated feed and real API statistics appear once the owner configures the TikTok integration — no placeholder content is shown."
              action={
                <a className="btn btn-blue btn-sm" href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <Icon.tiktok size={15} /> Open TikTok Profile
                </a>
              }
            />
          </>
        )}

        {!state.loading && !state.error && data && data.available && videos.length === 0 && (
          <EmptyState
            title="No videos yet"
            desc="Videos appear here as soon as the connected TikTok account publishes or the feed is configured."
          />
        )}

        {!state.loading && !state.error && data && videos.length > 0 && (
          <div className="tt-video-grid">
            {videos.map((v, i) => (
              <TikTokVideo key={v.id || v.videoId || i} video={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

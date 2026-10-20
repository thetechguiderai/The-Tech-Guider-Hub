import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../api';
import { Icon, ErrorState, Spinner } from './ui';
import { TikTokVideo, TikTokCreatorEmbed } from './TikTokEmbed';

/**
 * Homepage TikTok preview.
 *
 * Shows the creator's real identity and REAL videos only:
 *  - official API data of the connected account when available
 *  - otherwise owner-reported profile figures, clearly labelled
 *  - videos via official TikTok embeds (curated URLs or the official
 *    creator-profile widget)
 * Nothing is invented when a source is unavailable.
 */
export default function TikTokPreview() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [live, setLive] = useState(null);

  function load() {
    setState({ loading: true, data: null, error: null });
    publicApi
      .tiktokProfile()
      .then((d) => setState({ loading: false, data: d, error: null }))
      .catch(() => setState({ loading: false, data: null, error: 'TikTok data could not be loaded right now.' }));
    publicApi.tiktokLive().then(setLive).catch(() => setLive(null));
  }

  useEffect(() => { load(); }, []);

  const data = state.data;
  const profile = (data && data.profile) || {};
  const profileUrl = profile.profileUrl || 'https://www.tiktok.com/@legend0.26';
  const videos = (data && Array.isArray(data.videos) && data.videos.slice(0, 6)) || [];
  const liveUrl = (live && live.openUrl) || `${profileUrl}/live`;

  return (
    <section className="sec-x" id="tiktok" aria-labelledby="tiktok-heading">
      <div className="sec-x-head">
        <div>
          <div className="sec-x-eyebrow">
            <Icon.tiktok size={13} /> TikTok
          </div>
          <h2 className="sec-x-title" id="tiktok-heading">On TikTok</h2>
          <p className="sec-x-sub">
            Official posts and videos from The Tech Guider on TikTok.
          </p>
        </div>
        <Link to="/tiktok" className="visit-link">Open TikTok in the Hub <Icon.arrow size={14} /></Link>
      </div>

      {state.loading && <Spinner label="Loading TikTok videos…" />}

      {!state.loading && state.error && (
        <ErrorState title="TikTok unavailable" desc={state.error} retry={load} />
      )}

      {!state.loading && !state.error && data && (
        <>
          {/* LIVE — the button always opens the real stream page; no fake badge */}
          <div className="tt-live-row">
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              <span className="tt-live-dot" aria-hidden="true" /> Open TikTok LIVE
            </a>
            <span className="text-xs muted3">
              Live status is not available in the Hub — TikTok provides no authorized public live-status feed.
            </span>
          </div>

          <div className="tt-profile-bar">
            <a className="tt-profile-link" href={profileUrl} target="_blank" rel="noopener noreferrer">
              {profile.avatar ? (
                <img className="tt-avatar tt-avatar-img" src={profile.avatar} alt="" width="44" height="44" />
              ) : (
                <span className="tt-avatar" aria-hidden="true">
                  {(profile.displayName || profile.handle || 'TG').replace(/[@\W_]/g, '').slice(0, 2).toUpperCase() || 'TG'}
                </span>
              )}
              <span className="minwidth-0">
                <strong>{profile.displayName || `@${profile.handle}` || '@legend0.26'}</strong>
                <span className="text-xs muted3" style={{ display: 'block' }}>
                  {profileUrl.replace('https://', '')}
                </span>
              </span>
              {profile.statsSource === 'owner_reported' && profile.stats && (
                <span className="badge badge-gray tt-source-badge">Owner-reported</span>
              )}
            </a>
            <div className="flex gap-2 align-center">
              <a className="btn btn-blue btn-sm" href={profileUrl} target="_blank" rel="noopener noreferrer">
                <Icon.tiktok size={15} /> Open Profile
              </a>
            </div>
          </div>

          {profile.stats && (
            <div className="tt-stats-row">
              {profile.stats.followers && <span><b>{profile.stats.followers}</b> followers</span>}
              {profile.stats.following && <span><b>{profile.stats.following}</b> following</span>}
              {profile.stats.likes && <span><b>{profile.stats.likes}</b> likes</span>}
              {profile.stats.views && <span><b>{profile.stats.views}</b> views</span>}
            </div>
          )}

          {videos.length > 0 ? (
            <div className="tt-video-row">
              {videos.map((v, i) => (
                <TikTokVideo key={v.id || v.videoId || i} video={v} priority={i === 0} />
              ))}
            </div>
          ) : (
            <TikTokCreatorEmbed profileUrl={profileUrl} handle={profile.handle || 'legend0.26'} />
          )}
        </>
      )}
    </section>
  );
}

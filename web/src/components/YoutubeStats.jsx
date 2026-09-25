import React, { useEffect, useState } from 'react';
import { publicApi } from '../api';
import { ErrorState, Spinner, SectionHead, formatNum, timeAgo } from './ui';
import { Icon } from './ui';

function StatTile({ label, value, icon }) {
  return (
    <div className="stat-card">
      <div className="label">
        {icon}
        {label}
      </div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function YoutubeStats({ title = 'Live YouTube Statistics', compact = false }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  async function load() {
    setState({ loading: true, data: null, error: null });
    try {
      const data = await publicApi.youtubeStats();
      setState({ loading: false, data, error: null });
    } catch {
      setState({ loading: false, data: null, error: 'Unable to load YouTube statistics right now.' });
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const isCached = state.data && state.data.cached;

  return (
    <section id="youtube-stats" aria-labelledby="yt-stats-heading">
      <SectionHead
        eyebrow="YouTube"
        title={title}
        sub="Pulled directly from the YouTube Data API. Numbers shown are real — nothing is faked."
        right={
          <button className="btn btn-ghost btn-sm" onClick={load} aria-label="Refresh YouTube statistics">
            <Icon.refresh size={14} /> Refresh
          </button>
        }
      />
      <h2 id="yt-stats-heading" className="visually-hidden" style={{ display: 'none' }}>{title}</h2>

      {state.loading && <Spinner label="Loading YouTube statistics…" />}

      {state.error && (
        <ErrorState title="Stats unavailable" desc={state.error} retry={load} />
      )}

      {state.data && !state.data.available && (
        <div className="state">
          <div className="state-icon">
            <Icon.alert size={22} />
          </div>
          <div className="state-title">Stats unavailable</div>
          <p className="state-desc">{state.data.message || 'YouTube statistics could not be loaded.'}</p>
          {!isCached && (
            <p className="text-xs muted3" style={{ marginTop: -8, marginBottom: 14 }}>
              No fake numbers are shown — stats will appear once YouTube is configured by the owner.
            </p>
          )}
          {isCached && (
            <button className="btn btn-ghost btn-sm" onClick={load}>Try again</button>
          )}
        </div>
      )}

      {state.data && state.data.available && (
        <div>
          {state.data.stale && (
            <div className="alert alert-warning mb-2" role="status">
              <Icon.alert size={16} />
              <span>
                Showing the last cached statistics (fetched {state.data.cachedAt ? timeAgo(state.data.cachedAt) : 'earlier'})
                — the live API is temporarily unreachable.
              </span>
            </div>
          )}
          <div className="channel-card mb-2">
            {state.data.channel?.profilePicture ? (
              <img
                className="channel-avatar"
                src={state.data.channel.profilePicture}
                alt={`${state.data.channel.title} profile picture`}
                width="64"
                height="64"
              />
            ) : (
              <span className="channel-avatar fallback" aria-hidden="true">
                {(state.data.channel?.title || 'T').slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="minwidth-0">
              <div className="live-indicator" aria-label="Live statistics">
                <span className="ping" aria-hidden="true" />
                LIVE
              </div>
              <h3 style={{ fontSize: 20, marginTop: 6 }}>
                {state.data.channel?.title || 'The Tech Guider'}
              </h3>
              {state.data.channel?.handle && (
                <a
                  className="text-sm muted3"
                  href={`https://youtube.com/${state.data.channel.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  youtube.com/{state.data.channel.handle}
                </a>
              )}
            </div>
          </div>

          <div className="grid-cards mb-2">
            <StatTile
              label="Subscribers"
              value={formatNum(state.data.statistics?.subscriberCount)}
              icon={<Icon.profile size={13} />}
            />
            <StatTile
              label="Total views"
              value={formatNum(state.data.statistics?.viewCount)}
              icon={<Icon.eye size={13} />}
            />
            <StatTile
              label="Total likes"
              value={
                state.data.statistics?.likeCount == null
                  ? '—'
                  : formatNum(state.data.statistics.likeCount)
              }
              icon={<Icon.star size={13} />}
            />
            <StatTile
              label="Videos"
              value={formatNum(state.data.statistics?.videoCount)}
              icon={<Icon.video size={13} />}
            />
          </div>

          {state.data.latestVideo && (
            <div className={`yt-latest${compact ? '' : ''}`}>
              {state.data.latestVideo.thumbnail ? (
                <img
                  className="yt-thumb"
                  src={state.data.latestVideo.thumbnail}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span className="yt-thumb fallback" aria-hidden="true">
                  <Icon.video size={26} />
                </span>
              )}
              <div className="minwidth-0">
                <div className="eyebrow mb-2">Latest video</div>
                <h4 style={{ fontSize: 16 }}>{state.data.latestVideo.title}</h4>
                <div className="flex gap-2 align-center mt-2">
                  <a
                    className="visit-link"
                    href={state.data.latestVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch on YouTube <Icon.arrow size={14} />
                  </a>
                  <span className="text-xs muted3">{timeAgo(state.data.latestVideo.publishedAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
import React, { useEffect, useState } from 'react';
import { useMeta } from '../App';
import { useSite } from '../context';
import { publicApi } from '../api';
import { Icon, SectionHead, Spinner, ErrorState, formatNum, timeAgo } from '../components/ui';

function StatTile({ label, value, icon, note }) {
  return (
    <div className="stat-card">
      <div className="label">
        {icon}
        {label}
      </div>
      <div className="value">{value}</div>
      {note && <div className="text-xs muted3" style={{ marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function ChannelCard({ icon, name, url, urlLabel, source, stats, lastUpdated, children }) {
  return (
    <div className="card">
      <div className="channel-card" style={{ marginBottom: 16 }}>
        <span className="channel-avatar fallback" aria-hidden="true">{icon}</span>
        <div className="minwidth-0">
          <div className="live-indicator" aria-label="Live statistics">
            <span className="ping" aria-hidden="true" />
            LIVE
          </div>
          <h3 style={{ fontSize: 19, marginTop: 6 }}>{name}</h3>
          <a className="text-sm muted3" href={url} target="_blank" rel="noopener noreferrer">
            {urlLabel} <Icon.arrow size={12} style={{ verticalAlign: -2 }} />
          </a>
          <div className="text-xs muted3" style={{ marginTop: 4 }}>
            Source: {source}
            {lastUpdated ? ` · updated ${timeAgo(lastUpdated)}` : ''}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  useMeta(
    'Channel Analytics — The Tech Guider Hub',
    'Live YouTube and TikTok channel statistics for The Tech Guider — real public numbers, updated automatically.'
  );
  const { site } = useSite();
  const [yt, setYt] = useState({ loading: true, data: null, error: null });
  const [tt, setTt] = useState({ loading: true, data: null, error: null });

  async function loadYt() {
    setYt({ loading: true, data: null, error: null });
    try {
      setYt({ loading: false, data: await publicApi.youtubeStats(), error: null });
    } catch {
      setYt({ loading: false, data: null, error: 'YouTube statistics could not be loaded right now.' });
    }
  }

  async function loadTt() {
    setTt({ loading: true, data: null, error: null });
    try {
      setTt({ loading: false, data: await publicApi.tiktokProfile(), error: null });
    } catch {
      setTt({ loading: false, data: null, error: 'TikTok statistics could not be loaded right now.' });
    }
  }

  useEffect(() => {
    loadYt();
    loadTt();
    const t = setInterval(() => { loadYt(); loadTt(); }, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const ytStats = yt.data?.statistics;
  const ttProfile = tt.data?.profile;
  const ttStats = ttProfile?.stats;
  const combinedFollowers =
    (typeof ytStats?.subscriberCount === 'number' ? ytStats.subscriberCount : 0) +
    (typeof ttStats?.followers === 'number' ? ttStats.followers : 0);

  const latestTikTok = (tt.data?.videos || [])[0];

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 60 }}>
      <SectionHead
        eyebrow="Channel Analytics"
        title="The numbers, as they are"
        sub="The Tech Guider ke dono channels ki live public statistics — YouTube Data API se aur TikTok ki public profile se. Koi number fake nahi: jo data available nahi, wo saaf saaf 'unavailable' likha aata hai."
        right={
          <button className="btn btn-ghost btn-sm" onClick={() => { loadYt(); loadTt(); }} aria-label="Refresh analytics">
            <Icon.refresh size={14} /> Refresh
          </button>
        }
      />

      {(typeof combinedFollowers === 'number' && combinedFollowers > 0) && (
        <div className="grid-cards mb-2">
          <StatTile
            label="Combined followers (both channels)"
            value={formatNum(combinedFollowers)}
            icon={<Icon.chart size={13} />}
            note="YouTube subscribers + TikTok followers"
          />
          <StatTile
            label="Total YouTube views"
            value={typeof ytStats?.viewCount === 'number' ? formatNum(ytStats.viewCount) : '—'}
            icon={<Icon.eye size={13} />}
            note="Lifetime channel views"
          />
        </div>
      )}

      <div className="grid-2 mt-2" style={{ alignItems: 'start' }}>
        {/* ---------------- YouTube ---------------- */}
        <ChannelCard
          icon={<Icon.youtube size={24} />}
          name={yt.data?.channel?.title || 'The Tech Guider'}
          url={yt.data?.channel?.handle ? `https://youtube.com/${yt.data.channel.handle}` : 'https://youtube.com'}
          urlLabel={yt.data?.channel?.handle ? `youtube.com/${yt.data.channel.handle.replace('@', '')}` : 'Open channel'}
          source={yt.data?.available ? 'YouTube Data API (official)' : 'unavailable'}
          lastUpdated={yt.data?.cachedAt}
        >
          {yt.loading && <Spinner label="Loading YouTube statistics…" />}
          {!yt.loading && yt.error && <ErrorState title="Stats unavailable" desc={yt.error} retry={loadYt} />}
          {!yt.loading && !yt.error && yt.data && !yt.data.available && (
            <div className="state">
              <div className="state-title">YouTube stats unavailable</div>
              <p className="state-desc">{yt.data.message || 'Owner has not configured the YouTube API key yet. No fake numbers are shown.'}</p>
            </div>
          )}
          {!yt.loading && !yt.error && yt.data?.available && (
            <div className="grid-cards">
              <StatTile label="Subscribers" value={formatNum(ytStats?.subscriberCount)} icon={<Icon.profile size={13} />} />
              <StatTile label="Total views" value={formatNum(ytStats?.viewCount)} icon={<Icon.eye size={13} />} />
              <StatTile label="Videos" value={formatNum(ytStats?.videoCount)} icon={<Icon.video size={13} />} />
              <StatTile
                label="Total likes"
                value={ytStats?.likeCount == null ? '—' : formatNum(ytStats.likeCount)}
                icon={<Icon.star size={13} />}
                note={ytStats?.likeCount == null ? 'Requires extra API quota' : undefined}
              />
            </div>
          )}
          {!yt.loading && yt.data?.latestVideo && (
            <div className="eyebrow" style={{ marginTop: 16, marginBottom: 6 }}>Latest video: {yt.data.latestVideo.title}</div>
          )}
        </ChannelCard>

        {/* ---------------- TikTok ---------------- */}
        <ChannelCard
          icon={<Icon.tiktok size={24} />}
          name={ttProfile?.displayName || '@legend0.26'}
          url={ttProfile?.profileUrl || 'https://www.tiktok.com/@legend0.26'}
          urlLabel={ttProfile?.handle ? `@${ttProfile.handle}` : 'Open profile'}
          source={ttProfile?.statsSource === 'official_api'
            ? 'TikTok Display API (official)'
            : ttProfile?.statsSource === 'public_profile'
              ? 'Public TikTok profile (keyless, real)'
              : 'unavailable'}
          lastUpdated={tt.data?.cachedAt}
        >
          {tt.loading && <Spinner label="Loading TikTok statistics…" />}
          {!tt.loading && tt.error && <ErrorState title="Stats unavailable" desc={tt.error} retry={loadTt} />}
          {!tt.loading && !tt.error && tt.data && (!tt.data.available || (!ttStats?.followers && !ttProfile?.stats)) && (
            <div className="state">
              <div className="state-title">TikTok stats unavailable</div>
              <p className="state-desc">
                TikTok abhi is profile ki public numbers de nahi pa raha (complete embeds + profile link phir bhi kaam karte hain).
                Developer key connect hone par official API numbers yahan aa jayenge. Koi fake number nahi dikhaya jata.
              </p>
              <a className="btn btn-ghost btn-sm" href={ttProfile?.profileUrl || 'https://www.tiktok.com/@legend0.26'} target="_blank" rel="noopener noreferrer">
                Open TikTok profile <Icon.arrow size={14} />
              </a>
            </div>
          )}
          {!tt.loading && !tt.error && ttStats?.followers != null && (
            <div className="grid-cards">
              <StatTile label="Followers" value={formatNum(ttStats.followers)} icon={<Icon.profile size={13} />} />
              <StatTile label="Total likes" value={ttStats.likes != null ? formatNum(ttStats.likes) : '—'} icon={<Icon.star size={13} />} />
              <StatTile label="Videos" value={ttStats.videoCount != null ? formatNum(ttStats.videoCount) : '—'} icon={<Icon.video size={13} />} />
              <StatTile label="Following" value={ttStats.following != null ? formatNum(ttStats.following) : '—'} icon={<Icon.link size={13} />} />
            </div>
          )}
          {!tt.loading && latestTikTok?.embedLink && (
            <div className="eyebrow" style={{ marginTop: 16, marginBottom: 6 }}>
              Latest TikTok: <a href={latestTikTok.url || latestTikTok.embedLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'none' }}>watch here <Icon.arrow size={12} style={{ verticalAlign: -2 }} /></a>
            </div>
          )}
          {!tt.loading && (
            <a className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} href={`${ttProfile?.profileUrl || 'https://www.tiktok.com/@legend0.26'}/live`} target="_blank" rel="noopener noreferrer">
              <Icon.video size={14} /> TikTok Live page kholo (live watch link)
            </a>
          )}
        </ChannelCard>
      </div>

      {site?.social?.youtube && (
        <p className="text-xs muted3" style={{ textAlign: 'center', marginTop: 22 }}>
          Numbers auto-refresh every 15 minutes.
        </p>
      )}
    </div>
  );
}

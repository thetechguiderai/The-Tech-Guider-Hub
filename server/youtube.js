'use strict';

const { db } = require('./db');

const DEFAULT_REFRESH_MS = 15 * 60 * 1000;

function getSettings() {
  const row = db.prepare('SELECT * FROM youtube_settings WHERE id = 1').get() || {};
  // YOUTUBE_CHANNEL_ID in the environment is the fallback so deploys that only
  // provide env vars (e.g. Vercel) can show live stats without a DB write.
  const envChannel = process.env.YOUTUBE_CHANNEL_ID || '';
  return {
    channelId: row.channel_id || envChannel,
    refreshInterval: row.refresh_interval || 900,
    featuredVideo: row.featured_video || '',
    configStatus: row.config_status || 'not_configured',
    lastFetchAt: row.last_fetch_at || '',
    cachedStats: safeParse(row.cached_stats || '{}'),
  };
}

function tryDb(fn) {
  try {
    return fn();
  } catch {
    return null; // tolerate read-only / unavailable DB (e.g. ephemeral serverless FS)
  }
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

function markConfigured(channelId) {
  tryDb(() =>
    db.prepare(
      `UPDATE youtube_settings SET channel_id = ?, config_status = ?, last_fetch_at = ? WHERE id = 1`
    ).run(channelId, channelId ? 'configured' : 'not_configured', new Date().toISOString())
  );
}

function updateCache(payload) {
  tryDb(() =>
    db.prepare(
      'UPDATE youtube_settings SET cached_stats = ?, last_fetch_at = ? WHERE id = 1'
    ).run(JSON.stringify(payload), new Date().toISOString())
  );
}

let inFlight = null;

async function fetchFromYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY || '';
  const settings = getSettings();

  if (!apiKey) {
    return {
      available: false,
      reason: 'not_configured',
      message: 'YouTube statistics are not configured yet. The owner needs to add a YouTube Data API key.',
      cached: settings.cachedStats && settings.cachedStats.cachedAt ? settings.cachedStats : null,
    };
  }
  if (!settings.channelId) {
    return {
      available: false,
      reason: 'no_channel',
      message: 'No YouTube channel is selected. The owner can set a channel in the dashboard.',
      cached: settings.cachedStats && settings.cachedStats.cachedAt ? settings.cachedStats : null,
    };
  }

  markConfigured(settings.channelId);

  // Serve fresh cache when within the refresh window.
  const cached = settings.cachedStats;
  if (cached && cached.cachedAt) {
    const age = Date.now() - new Date(cached.cachedAt).getTime();
    if (age < (settings.refreshInterval || 900) * 1000) {
      return { available: true, stale: false, ...cached };
    }
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    const base = 'https://www.googleapis.com/youtube/v3';
    try {
      const channelRes = await fetch(
        `${base}/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(settings.channelId)}&key=${apiKey}`
      );
      if (!channelRes.ok) throw new Error(`channel endpoint ${channelRes.status}`);
      const channelJson = await channelRes.json();
      const channel = channelJson.items && channelJson.items[0];
      if (!channel) throw new Error('Channel not found');

      let latest = null;
      const uploads = channel.contentDetails && channel.contentDetails.relatedPlaylists && channel.contentDetails.relatedPlaylists.uploads;
      if (uploads) {
        const listRes = await fetch(
          `${base}/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploads)}&maxResults=1&key=${apiKey}`
        );
        if (listRes.ok) {
          const listJson = await listRes.json();
          const item = listJson.items && listJson.items[0];
          if (item) {
            const sn = item.snippet;
            latest = {
              id: sn.resourceId && sn.resourceId.videoId,
              title: sn.title || '',
              thumbnail: sn.thumbnails && sn.thumbnails.high ? sn.thumbnails.high.url : (sn.thumbnails && sn.thumbnails.default ? sn.thumbnails.default.url : ''),
              publishedAt: sn.publishedAt || '',
              url: `https://www.youtube.com/watch?v=${sn.resourceId.videoId}`,
            };
          }
        }
      }

      const stats = channel.statistics || {};
      const payload = {
        available: true,
        stale: false,
        cachedAt: new Date().toISOString(),
        channel: {
          id: channel.id,
          title: channel.snippet.title || '',
          handle: channel.snippet.customUrl || '',
          description: channel.snippet.description || '',
          profilePicture: channel.snippet.thumbnails && channel.snippet.thumbnails.medium
            ? channel.snippet.thumbnails.medium.url
            : (channel.snippet.thumbnails && channel.snippet.thumbnails.default ? channel.snippet.thumbnails.default.url : ''),
          banner: channel.snippet.thumbnails && channel.snippet.thumbnails.high ? channel.snippet.thumbnails.high.url : '',
        },
        statistics: {
          subscriberCount: safeInt(stats.subscriberCount),
          viewCount: safeInt(stats.viewCount),
          videoCount: safeInt(stats.videoCount),
          likeCount: stats.likeCount ? safeInt(stats.likeCount) : null,
          hiddenSubscriberCount: stats.hiddenSubscriberCount === true,
        },
        latestVideo: latest,
      };
      updateCache(payload);
      return payload;
    } catch (err) {
      const fallback = settings.cachedStats && settings.cachedStats.cachedAt
        ? { ...settings.cachedStats, available: true, stale: true, refreshError: err.message }
        : null;
      return {
        available: false,
        stale: false,
        reason: 'api_error',
        message: 'Unable to load YouTube statistics right now.',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message,
        cached: fallback,
      };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function safeInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

module.exports = { fetchFromYouTube, getSettings, markConfigured, DEFAULT_REFRESH_MS };
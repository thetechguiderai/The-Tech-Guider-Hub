import React, { useEffect, useRef } from 'react';

/**
 * Official TikTok embeds.
 *
 * Loads https://www.tiktok.com/embed.js once per document and renders official
 * `<blockquote class="tiktok-embed">` elements. If the script is blocked or the
 * request fails, we fall back to a real link card — never a fake frame.
 */

function ensureEmbedScript() {
  return new Promise((resolve, reject) => {
    if (window.tiktokEmbed && window.tiktokEmbed.lib) return resolve();
    if (document.querySelector('script[data-tiktok-embed]')) {
      // Wait slightly for the script to finish booting.
      const t = setInterval(() => {
        if (window.tiktokEmbed && window.tiktokEmbed.lib) {
          clearInterval(t);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(t);
        if (!(window.tiktokEmbed && window.tiktokEmbed.lib)) {
          reject(new Error('TikTok embed script did not initialise.'));
        }
      }, 5000);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://www.tiktok.com/embed.js';
    s.async = true;
    s.setAttribute('data-tiktok-embed', '1');
    s.onload = () => {
      // The global is registered a tick after onload.
      let n = 0;
      const t = setInterval(() => {
        n++;
        if (window.tiktokEmbed && window.tiktokEmbed.lib) {
          clearInterval(t);
          resolve();
        } else if (n > 30) {
          clearInterval(t);
          reject(new Error('TikTok embed script did not initialise.'));
        }
      }, 100);
    };
    s.onerror = () => reject(new Error('TikTok embed script blocked or unreachable.'));
    document.head.appendChild(s);
  });
}

export function useTikTokEmbeds(deps = []) {
  const ref = useRef(null);
  const [mode, setMode] = React.useState('pending');

  useEffect(() => {
    let cancelled = false;
    setMode('pending');
    if (!ref.current) return () => { cancelled = true; };

    ensureEmbedScript()
      .then(() => {
        if (cancelled || !ref.current) return;
        try {
          // Attempts an official render of all blockquotes inside the container.
          window.tiktokEmbed.lib.render(ref.current);
          setMode('active');
        } catch {
          setMode('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setMode('fallback');
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ref, mode };
}

/**
 * Official creator-profile embed (needs no developer app). Lists the creator's
 * public videos in a TikTok-hosted widget; falls back to a profile link card.
 */
export function TikTokCreatorEmbed({ profileUrl, handle }) {
  const { ref, mode } = useTikTokEmbeds([profileUrl, handle]);
  if (!profileUrl || !handle) return null;

  return (
    <div className={`tt-video-card tt-creator-embed${mode === 'fallback' ? ' tt-embed-fallback' : ''}`}>
      <div className="tt-embed-wrap" ref={ref}>
        <blockquote
          className="tiktok-embed"
          cite={profileUrl}
          data-unique-id={handle}
          data-embed-type="creator"
          style={{ maxWidth: '100%', minWidth: 0, margin: 0 }}
        >
          <section>
            <a
              target="_blank"
              rel="noopener noreferrer"
              title={profileUrl}
              href={`${profileUrl}?refer=creator_embed`}
            >
              @{handle}
            </a>
          </section>
        </blockquote>
      </div>
      {mode === 'fallback' && (
        <a className="tt-video-fallback" href={profileUrl} target="_blank" rel="noopener noreferrer">
          <span className="tt-video-icon" aria-hidden="true">
            <IconArrow />
          </span>
          <span className="minwidth-0">
            <strong>Open TikTok Profile</strong>
            <span className="muted3 text-xs" style={{ display: 'block' }}>
              The official creator widget could not load here.
            </span>
          </span>
        </a>
      )}
    </div>
  );
}

function IconArrow() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * One official video embed. `mode !== 'active'` => real link fallback card.
 */
export function TikTokVideo({ video, priority = false }) {
  const href = video.url || (video.videoId ? `https://www.tiktok.com/@-/video/${video.videoId}` : '');
  const { ref, mode } = useTikTokEmbeds([video.videoId || video.url, href]);

  if (!video.videoId && !video.url) return null;

  return (
    <div className={`tt-video-card${mode === 'fallback' ? ' tt-embed-fallback' : ''}`} data-priority={priority}>
      <div className="tt-embed-wrap" ref={ref}>
        <blockquote
          className="tiktok-embed"
          cite={href}
          data-video-id={video.videoId || ''}
          style={{ maxWidth: '100%', minWidth: 0, margin: 0 }}
        >
          <section>
            <a
              target="_blank"
              rel="noopener noreferrer"
              title={href}
              href={href}
            >
              {video.title || 'Watch this video on TikTok'}
            </a>
          </section>
        </blockquote>
      </div>
      {mode === 'fallback' && (
        <a className="tt-video-fallback" href={href} target="_blank" rel="noopener noreferrer">
          <span className="tt-video-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14.5 3v5.2a4.2 4.2 0 1 1-4.2 4.2V3h-1A5.3 5.3 0 0 0 4 8.3v.2A5.3 5.3 0 0 0 9.3 13.8h.6v-1.7c-1.9 0-3.4-1.5-3.4-3.4V8.3c0-1.9 1.5-3.4 3.4-3.4h2.9v9.8a2.3 2.3 0 1 0 2.3-2.3h-.4v-1.7h.4c2.2 0 3.9 1.7 3.9 4s-1.8 4-4 4-4-1.8-4-4V3h-3z" />
            </svg>
          </span>
          <span className="minwidth-0">
            <strong>Watch on TikTok</strong>
            <span className="muted3 text-xs" style={{ display: 'block' }}>
              The embedded player could not load here.
            </span>
          </span>
        </a>
      )}
    </div>
  );
}

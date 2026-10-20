import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { publicApi } from '../api';
import { useSite } from '../context';
import { useMeta } from '../App';
import { Icon, ErrorState, EmptyState, formatNum } from '../components/ui';
import { VideoCard } from '../components/cards';
import YoutubeStats from '../components/YoutubeStats';
import AIComposer from '../components/AIComposer';
import TikTokPreview from '../components/TikTokPreview';
import { socialLink, SUBSCRIBE_URL } from '../links';

function RevealSection({ children }) {
  const reduce = useReducedMotion();
  const initial = reduce ? false : { opacity: 0, y: 14 };
  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExternal(href) {
  return /^https?:\/\//i.test(href || '');
}

// Pick the best real destination for a video: YouTube URL, else internal page.
function watchHref(v) {
  if (!v) return '/videos';
  return v.youtubeUrl || v.url || (v.id != null ? `/videos/${v.id}` : '/videos');
}

// Renders an <a> for external links and a router <Link> for internal ones.
function WatchLink({ href, className, children, ariaLabel }) {
  if (isExternal(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={href || '/videos'} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

function SkeletonGrid({ count = 6 }) {
  return (
    <div className="video-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-card" key={i}>
          <div className="skel skel-thumb" />
          <div style={{ padding: 16, display: 'grid', gap: 10 }}>
            <div className="skel" style={{ height: 15, width: '85%' }} />
            <div className="skel" style={{ height: 12, width: '55%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const GAMING_HUBS = [
  { to: '/minecraft?edition=java', icon: Icon.minecraft, title: 'Minecraft Java', desc: 'Mods, resource packs, hosting and performance guides for Java Edition.' },
  { to: '/minecraft?edition=bedrock', icon: Icon.grid, title: 'Minecraft Bedrock', desc: 'Add-ons, maps and tools for Bedrock on mobile, console and PC.' },
  { to: '/free-fire-sensitivity', icon: Icon.tool, title: 'Free Fire', desc: 'Sensitivity generator, ID sale & purchase and rank push services.' },
  { to: '/videos', icon: Icon.video, title: 'Gaming Tutorials', desc: 'Gameplay guides, tips and step-by-step tutorials from the channel.' },
  { to: '/minecraft', icon: Icon.resource, title: 'Mods & Resource Packs', desc: 'Curated mods, packs and downloads arranged in one place.' },
  { to: '/free-fire-sensitivity', icon: Icon.chart, title: 'FPS Optimization', desc: 'Tune your device, sensitivity and settings for smoother play.' },
];

const GAMING_TOOLS = [
  { to: '/free-fire-sensitivity', icon: Icon.tool, title: 'Free Fire Sensitivity Generator', desc: 'Custom sensitivity tuned for your device, RAM, refresh rate and play style.' },
  { to: '/minecraft', icon: Icon.minecraft, title: 'Minecraft Resource & Mod Guides', desc: 'Find the right mods, packs and hosting for your setup.' },
  { to: '/resources', icon: Icon.chart, title: 'PC Gaming Optimization Guides', desc: 'Settings and resources used across our performance videos.' },
  { to: '/tools', icon: Icon.grid, title: 'Useful Gaming Utilities', desc: 'Every free tool from The Tech Guider, collected in one hub.' },
];

const SERVICES = [
  { to: '/video-editing-packages', icon: Icon.video, title: 'Video Editing', desc: 'Shorts, long-form and monthly editing packages for creators.', price: 'Rs. 500' },
  { to: '/video-editing-packages', icon: Icon.star, title: 'Thumbnail Design', desc: 'Scroll-stopping thumbnails designed to match your style.', price: 'Rs. 300' },
  { to: '/logo-packages', icon: Icon.shield, title: 'Logo Design', desc: 'Custom logos and branding for channels and businesses.', price: 'Rs. 799' },
  { to: '/website-packages', icon: Icon.globe, title: 'Website Development', desc: 'Modern, fast websites built for creators and businesses.', price: 'Rs. 4,999' },
];

export default function Home() {
  useMeta(
    'The Tech Guider Hub — Technology. Gaming. Beyond Limits.',
    'Discover tech tutorials, gaming content, useful tools and practical guides from The Tech Guider.'
  );
  const { site } = useSite();
  const [videosState, setVideosState] = useState({ loading: true, videos: [], error: null });
  const [stats, setStats] = useState(null);
  const [cat, setCat] = useState('All');

  function loadVideos() {
    setVideosState({ loading: true, videos: [], error: null });
    publicApi
      .videos()
      .then((d) => setVideosState({ loading: false, videos: d.videos || [], error: null }))
      .catch(() => setVideosState({ loading: false, videos: [], error: 'We could not reach the video catalogue right now.' }));
  }

  useEffect(() => { loadVideos(); }, []);
  useEffect(() => {
    publicApi.youtubeStats().then(setStats).catch(() => setStats(null));
  }, []);

  const published = useMemo(
    () => videosState.videos.filter((v) => v.status !== 'coming_soon'),
    [videosState.videos]
  );
  const comingSoon = useMemo(
    () => videosState.videos.filter((v) => v.status === 'coming_soon'),
    [videosState.videos]
  );

  const featured = published[0] || null;
  const latestVideo = stats && stats.available ? stats.latestVideo : null;

  const categories = useMemo(() => {
    const set = new Set();
    published.forEach((v) => { if (v.category) set.add(v.category); });
    return ['All', ...Array.from(set)];
  }, [published]);

  const filtered = cat === 'All' ? published : published.filter((v) => v.category === cat);

  const heroVideo = featured || latestVideo;
  const heroWatch = watchHref(heroVideo);
  const heroThumb = (featured && featured.thumbnail) || (latestVideo && latestVideo.thumbnail) || '';
  const statsAvail = stats && stats.available ? stats.statistics : null;

  const discord = socialLink(site, 'discord');

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="hero-x">
        <div className="container hero-x-inner">
          <div>
            <span className="hero-x-eyebrow">
              <Icon.youtube size={13} /> Official YouTube Channel
            </span>
            <h1>
              Technology. Gaming.<br />
              <span className="dim">Beyond Limits.</span>
            </h1>
            <p className="hero-x-sub">
              Discover tech tutorials, gaming content, useful tools, and practical guides from The Tech Guider.
            </p>
            <div className="hero-x-actions">
              <WatchLink href={heroWatch} className="btn btn-blue btn-lg">
                <Icon.video size={18} /> Watch Latest Video
              </WatchLink>
              <Link to="/tools" className="btn btn-ghost btn-lg">
                <Icon.tool size={18} /> Explore Tools
              </Link>
            </div>
            <div className="hero-x-meta">
              {statsAvail && !statsAvail.hiddenSubscriberCount && statsAvail.subscriberCount != null && (
                <span><b>{formatNum(statsAvail.subscriberCount)}</b> subscribers</span>
              )}
              {statsAvail && statsAvail.videoCount != null && (
                <span><b>{formatNum(statsAvail.videoCount)}</b> videos</span>
              )}
              {statsAvail && statsAvail.viewCount != null && (
                <span><b>{formatNum(statsAvail.viewCount)}</b> total views</span>
              )}
            </div>
          </div>

          <div>
            {heroThumb ? (
              <WatchLink href={heroWatch} className="media-frame hero-x-media thumb-zoom" ariaLabel="Watch the latest video">
                <img src={heroThumb} alt={(heroVideo && heroVideo.title) || 'Latest upload'} />
                <span className="play-btn"><span><Icon.video size={26} /></span></span>
              </WatchLink>
            ) : (
              <div className="media-frame hero-x-media" style={{ display: 'grid', placeItems: 'center' }}>
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <img
                    src="/logo.png"
                    width="64"
                    height="64"
                    alt=""
                    style={{ borderRadius: 14, margin: '0 auto 14px', display: 'block' }}
                  />
                  <div className="sec-x-eyebrow" style={{ marginBottom: 4 }}>Live on YouTube</div>
                  <p className="x-card-desc" style={{ maxWidth: 260, margin: '0 auto 16px' }}>
                    New videos, tutorials and gaming content — subscribe to stay updated.
                  </p>
                  <a className="btn btn-blue" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
                    <Icon.youtube size={16} /> Subscribe
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- AI ASSISTANT ---------------- */}
      <section className="container sec-x" id="ai">
        <AIComposer />
      </section>

      {/* ---------------- TIKTOK PREVIEW ---------------- */}
      <RevealSection>
        <div className="container">
          <TikTokPreview />
        </div>
      </RevealSection>

      {/* ---------------- FEATURED VIDEO ---------------- */}
      {(featured || latestVideo) && (
        <RevealSection>
          <section className="container sec-x" id="featured">
            <div className="sec-x-head">
              <div>
                <div className="sec-x-eyebrow">Featured</div>
                <h2 className="sec-x-title">Latest from the channel</h2>
              </div>
              <Link to="/videos" className="visit-link">All videos <Icon.arrow size={14} /></Link>
            </div>
            <article className="feat-x">
              <WatchLink
                href={heroWatch}
                className="feat-x-media thumb-zoom media-frame"
                ariaLabel="Watch video"
              >
                {heroThumb ? (
                  <img src={heroThumb} alt="Video thumbnail" />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--card-2)' }} />
                )}
                <span className="play-btn"><span><Icon.video size={26} /></span></span>
              </WatchLink>
              <div className="feat-x-body">
                {featured && featured.category && (
                  <div className="feat-x-meta"><span className="chip" style={{ pointerEvents: 'none' }}>{featured.category}</span></div>
                )}
                <h3 className="feat-x-title">{heroVideo.title || 'Latest upload'}</h3>
                <div className="feat-x-meta">
                  {fmtDate(heroVideo.releaseDate || heroVideo.publishedAt) && (
                    <span>{fmtDate(heroVideo.releaseDate || heroVideo.publishedAt)}</span>
                  )}
                </div>
                <div style={{ marginTop: 6 }}>
                  <WatchLink href={heroWatch} className="btn btn-blue">
                    Watch Now <Icon.arrow size={16} />
                  </WatchLink>
                </div>
              </div>
            </article>
          </section>
        </RevealSection>
      )}

      {/* ---------------- LATEST VIDEOS ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="videos">
          <div className="sec-x-head">
            <div>
              <div className="sec-x-eyebrow">Latest Videos</div>
              <h2 className="sec-x-title">Fresh uploads</h2>
              <p className="sec-x-sub">Real uploads and their resources — pulled straight from the channel.</p>
            </div>
            <Link to="/videos" className="visit-link">Browse all <Icon.arrow size={14} /></Link>
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 22 }}>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${cat === c ? ' on' : ''}`}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {videosState.loading && <SkeletonGrid />}
          {!videosState.loading && videosState.error && (
            <ErrorState title="Couldn't load videos" desc={videosState.error} retry={loadVideos} />
          )}
          {!videosState.loading && !videosState.error && filtered.length === 0 && (
            <EmptyState title="No videos yet" desc="New uploads from the channel will appear here automatically." />
          )}
          {!videosState.loading && !videosState.error && filtered.length > 0 && (
            <div className="video-grid">
              {filtered.slice(0, 8).map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          )}
        </section>
      </RevealSection>

      {/* ---------------- CHANNEL STATS ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="stats">
          <YoutubeStats />
        </section>
      </RevealSection>

      {/* ---------------- GAMING HUB ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="gaming">
          <div className="sec-x-head">
            <div>
              <div className="sec-x-eyebrow">Gaming Hub</div>
              <h2 className="sec-x-title">Everything gaming</h2>
              <p className="sec-x-sub">Minecraft, Free Fire, tutorials and optimisation — organised by category.</p>
            </div>
          </div>
          <div className="grid-cards">
            {GAMING_HUBS.map(({ to, icon: IconComp, title, desc }) => (
              <Link key={title} to={to} className="x-card">
                <span className="x-icon"><IconComp size={20} /></span>
                <div className="x-card-title">{title}</div>
                <p className="x-card-desc">{desc}</p>
                <span className="x-card-foot">Explore <Icon.arrow size={15} /></span>
              </Link>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ---------------- GAMING TOOLS ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="gaming-tools">
          <div className="sec-x-head">
            <div>
              <div className="sec-x-eyebrow">Gaming Tools</div>
              <h2 className="sec-x-title">Tools that actually work</h2>
              <p className="sec-x-sub">Every tool opens a real, functional destination — no fake buttons.</p>
            </div>
            <Link to="/tools" className="visit-link">All tools <Icon.arrow size={14} /></Link>
          </div>
          <div className="grid-cards">
            {GAMING_TOOLS.map(({ to, icon: IconComp, title, desc }) => (
              <Link key={title} to={to} className="x-card">
                <span className="x-icon"><IconComp size={20} /></span>
                <div className="x-card-title">{title}</div>
                <p className="x-card-desc">{desc}</p>
                <span className="x-card-foot">Open <Icon.arrow size={15} /></span>
              </Link>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ---------------- UPCOMING VIDEOS ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="upcoming">
          <div className="sec-x-head">
            <div>
              <div className="sec-x-eyebrow">Coming Soon</div>
              <h2 className="sec-x-title">Upcoming videos</h2>
            </div>
            <Link to="/videos" className="visit-link">All videos <Icon.arrow size={14} /></Link>
          </div>
          {comingSoon.length > 0 ? (
            <div className="video-grid">
              {comingSoon.slice(0, 4).map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          ) : (
            <EmptyState
              title="Nothing scheduled yet"
              desc="New announcements will appear here as soon as the owner adds them."
            />
          )}
        </section>
      </RevealSection>

      {/* ---------------- SERVICES ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="services">
          <div className="sec-x-head">
            <div>
              <div className="sec-x-eyebrow">Services</div>
              <h2 className="sec-x-title">Creator &amp; business services</h2>
              <p className="sec-x-sub">Clear starting prices. Final quotes are agreed on Discord before we begin.</p>
            </div>
            <a className="btn btn-ghost" href={discord} target="_blank" rel="noopener noreferrer">
              <Icon.discord size={16} /> Contact on Discord
            </a>
          </div>
          <div className="grid-cards">
            {SERVICES.map(({ to, icon: IconComp, title, desc, price }) => (
              <div key={title} className="x-card svc-x">
                <span className="x-icon"><IconComp size={20} /></span>
                <div className="x-card-title">{title}</div>
                <p className="x-card-desc">{desc}</p>
                <div className="svc-price">Starting at <b>{price}</b></div>
                <Link to={to} className="x-card-foot">View packages <Icon.arrow size={15} /></Link>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ---------------- AI PANEL ---------------- */}
      <RevealSection>
        <section className="container sec-x" aria-label="The Tech Guider AI">
          <div className="x-card" style={{ padding: 36, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ maxWidth: 620 }}>
              <div className="sec-x-eyebrow">The Tech Guider AI</div>
              <h2 className="sec-x-title" style={{ fontSize: 'clamp(22px, 3vw, 30px)', marginTop: 8 }}>
                Your AI assistant by The Tech Guider.
              </h2>
              <p className="sec-x-sub" style={{ marginTop: 10 }}>
                Ask questions, get recommendations and find your way around everything on the channel.
              </p>
            </div>
            <Link to="/ai" className="btn btn-blue btn-lg">
              <Icon.ai size={18} /> Open The Tech Guider AI
            </Link>
          </div>
        </section>
      </RevealSection>

      {/* ---------------- ABOUT / SOCIALS ---------------- */}
      <RevealSection>
        <section className="container sec-x" id="about">
          <div className="x-card" style={{ padding: 40 }}>
            <div className="sec-x-eyebrow">About</div>
            <h2 className="sec-x-title" style={{ marginTop: 8 }}>One hub for everything Tech Guider</h2>
            <p className="sec-x-sub" style={{ maxWidth: 780 }}>
              The Tech Guider Hub brings together every video, resource, tool and service from The Tech Guider —
              technology tutorials, gaming content, Minecraft and Free Fire, plus creator and business services.
            </p>
            <div className="hero-x-actions">
              <a className="btn btn-ghost" href={socialLink(site, 'youtube')} target="_blank" rel="noopener noreferrer">
                <Icon.youtube size={16} /> YouTube
              </a>
              <a className="btn btn-ghost" href={discord} target="_blank" rel="noopener noreferrer">
                <Icon.discord size={16} /> Discord
              </a>
              <a className="btn btn-ghost" href={socialLink(site, 'instagram')} target="_blank" rel="noopener noreferrer">
                <Icon.instagram size={16} /> Instagram
              </a>
            </div>
          </div>
        </section>
      </RevealSection>
    </>
  );
}

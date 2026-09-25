import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../api';
import { useSite } from '../context';
import { useMeta } from '../App';
import { SectionHead, Badge, Icon } from '../components/ui';
import { VideoCard } from '../components/cards';
import YoutubeStats from '../components/YoutubeStats';

export default function Home() {
  useMeta(
    'The Tech Guider Hub — Resources, Tools & More',
    'Everything from The Tech Guider in one place. Video resources, tools, the Free Fire sensitivity generator, Minecraft hub, YouTube stats and more.'
  );
  const { site } = useSite();
  const [comingSoon, setComingSoon] = useState([]);

  useEffect(() => {
    publicApi
      .videos()
      .then((d) => setComingSoon((d.videos || []).filter((v) => v.status === 'coming_soon')))
      .catch(() => setComingSoon([]));
  }, []);

  const quickNav = [
    { to: '/resources', icon: Icon.resource, title: 'Video Resources', desc: 'Everything used in the videos — hosts, tools and links.' },
    { to: '/videos', icon: Icon.video, title: 'Coming Soon', desc: 'Upcoming videos and what is being prepared.' },
    { to: '/#youtube-stats', icon: Icon.chart, title: 'YouTube Stats', desc: 'Real channel statistics, straight from YouTube.' },
    { to: '/free-fire-sensitivity', icon: Icon.tool, title: 'FF Sensitivity', desc: 'Generate a Free Fire sensitivity setup for your device.' },
    { to: '/minecraft', icon: Icon.minecraft, title: 'Minecraft', desc: 'Java & Bedrock resources, hosting, tools and guides.' },
    { to: '/ai', icon: Icon.ai, title: 'The Tech Guider AI', desc: 'Your AI assistant by The Tech Guider.' },
  ];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-grid-lines" />
          <div className="hero-glow a" />
          <div className="hero-glow b" />
        </div>
        <div className="container" style={{ position: 'relative' }}>
          <div className="hero-badge">
            <span className="dot" aria-hidden="true" />
            Official resource hub
          </div>
          <h1>
            THE TECH GUIDER <span className="hero-mark">HUB</span>
          </h1>
          <p className="hero-sub">{site?.tagline || 'Everything from The Tech Guider, in one place.'}</p>
          <div className="hero-actions">
            <Link to="/resources" className="btn btn-primary btn-lg">
              Explore Resources
            </Link>
            <a
              className="btn btn-ghost btn-lg"
              href={site?.social?.youtube || 'https://www.youtube.com/'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon.youtube size={18} /> YouTube Channel
            </a>
            <Link to="/ai" className="btn btn-ghost btn-lg">
              <Icon.ai size={18} /> The Tech Guider AI
            </Link>
          </div>
        </div>
      </section>

      {/* QUICK NAV */}
      <section className="container" aria-label="Quick navigation">
        <div className="grid-hero-nav">
          {quickNav.map(({ to, icon: IconComp, title, desc }) => (
            <Link key={title + to} to={to} className="card card-hover" style={{ textDecoration: 'none' }}>
              <div className="flex align-center gap-2">
                <span className="resource-logo fallback" aria-hidden="true">
                  <IconComp size={20} />
                </span>
                <h3 className="resource-name">{title}</h3>
              </div>
              <p className="text-sm muted mt-2">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* COMING SOON */}
      {comingSoon.length > 0 && (
        <section className="container mt-4" aria-labelledby="home-coming-heading">
          <SectionHead
            eyebrow="Coming soon"
            title="What is coming next"
            right={
              <Link to="/videos" className="visit-link">
                All videos <Icon.arrow size={14} />
              </Link>
            }
          />
          <h2 id="home-coming-heading" style={{ display: 'none' }}>Coming soon videos</h2>
          <div className="video-grid">
            {comingSoon.slice(0, 4).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}

      {/* YOUTUBE STATS */}
      <section className="container mt-4">
        <YoutubeStats />
      </section>

      {/* AI PANEL */}
      <section className="container mt-4" aria-label="The Tech Guider AI">
        <div className="card" style={{ background: 'var(--bg-2)', padding: 36, borderColor: 'var(--border)' }}>
          <div className="flex align-center gap-2 flex-wrap justify-between">
            <div>
              <div className="eyebrow mb-2">The Tech Guider AI</div>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)' }}>Your AI assistant by The Tech Guider.</h2>
              <p className="section-sub">Ask questions, get recommendations and find your way around everything on the channel.</p>
            </div>
            <Link to="/ai" className="btn btn-accent btn-lg">
              <Icon.ai size={18} /> Open The Tech Guider AI
            </Link>
          </div>
        </div>
      </section>

      {/* SOCIAL STRIP */}
      <section className="container mt-4" aria-label="Follow The Tech Guider">
        <div className="text-center" style={{ textAlign: 'center' }}>
          <div className="eyebrow mb-2">Stay connected</div>
          <p className="section-sub" style={{ margin: '0 auto' }}>Join the community across platforms and never miss a video.</p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            {site?.social?.youtube && (
              <a className="btn btn-ghost" href={site.social.youtube} target="_blank" rel="noopener noreferrer">
                <Icon.youtube size={16} /> YouTube
              </a>
            )}
            {site?.social?.discord && (
              <a className="btn btn-ghost" href={site.social.discord} target="_blank" rel="noopener noreferrer">
                <Icon.discord size={16} /> Discord
              </a>
            )}
            {site?.social?.instagram && (
              <a className="btn btn-ghost" href={site.social.instagram} target="_blank" rel="noopener noreferrer">
                <Icon.instagram size={16} /> Instagram
              </a>
            )}
            {site?.social?.tiktok && (
              <a className="btn btn-ghost" href={site.social.tiktok} target="_blank" rel="noopener noreferrer">
                <Icon.tiktok size={16} /> TikTok
              </a>
            )}
            {site?.social?.x && (
              <a className="btn btn-ghost" href={site.social.x} target="_blank" rel="noopener noreferrer">
                <Icon.x size={15} /> X
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
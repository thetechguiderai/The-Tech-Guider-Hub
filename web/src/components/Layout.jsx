import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { publicApi } from '../api';
import { useSite } from '../context';
import { Icon, Spinner } from './ui';
import { SITE_LINKS, socialLink, SUBSCRIBE_URL } from '../links';

// Primary navigation. Items with `children` render a flyout (grouped).
export const NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/videos', label: 'Videos', icon: 'video' },
  {
    label: 'Gaming',
    icon: 'minecraft',
    children: [
      { to: '/minecraft', label: 'Minecraft Hub' },
      { to: '/free-fire-sensitivity', label: 'Free Fire' },
      { to: '/videos', label: 'Gaming Tutorials' },
    ],
  },
  {
    label: 'Tools',
    icon: 'tool',
    children: [
      { to: '/tools', label: 'All Tools' },
      { to: '/free-fire-sensitivity', label: 'Sensitivity Generator' },
      { to: '/ai', label: 'Tech Guider AI' },
    ],
  },
  {
    label: 'Services',
    icon: 'star',
    children: [
      { to: '/video-editing-packages', label: 'Video Editing' },
      { to: '/logo-packages', label: 'Logo Design' },
      { to: '/website-packages', label: 'Website Development' },
      { to: '/games-packages', label: 'Games' },
    ],
  },
  { to: '/resources', label: 'Resources', icon: 'resource' },
  { to: '/about', label: 'About', icon: 'profile' },
];

function Logo({ small }) {
  return (
    <Link to="/" className="brand" aria-label="The Tech Guider 01 — Home">
      <img
        src="/logo.png"
        alt="The Tech Guider 01"
        width="36"
        height="36"
        className="brand-mark"
        style={{ objectFit: 'contain', borderRadius: 8 }}
      />
      <span className={small ? '' : 'hide-mobile'}>The Tech Guider 01</span>
    </Link>
  );
}

function NavRail() {
  return (
    <nav className="nav-rail" aria-label="Primary">
      {NAV.map((n) => {
        const Ico = Icon[n.icon] || Icon.grid;
        if (n.children) {
          return (
            <div className="rail-item" key={n.label}>
              <button type="button" className="rail-link" aria-haspopup="true" aria-label={n.label}>
                <Ico size={18} />
                <span>{n.label}</span>
              </button>
              <div className="rail-flyout" role="menu">
                <div className="rail-flyout-label">{n.label}</div>
                {n.children.map((c) => (
                  <NavLink
                    key={`${c.to}-${c.label}`}
                    to={c.to}
                    className={({ isActive }) => `rail-flyout-link${isActive ? ' active' : ''}`}
                  >
                    {c.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        }
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}
          >
            <Ico size={18} />
            <span>{n.label}</span>
          </NavLink>
        );
      })}
      <div className="rail-divider" />
      <a className="rail-link rail-subscribe" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
        <Icon.youtube size={18} />
        <span>Subscribe</span>
      </a>
    </nav>
  );
}

function Header({ onOpenSearch }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        onOpenSearch();
      }
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenSearch]);

  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container">
          <div className="site-header-inner">
            <Logo />
            <div className="header-actions">
              <button className="search-trigger" onClick={onOpenSearch} aria-label="Search the hub">
                <Icon.search size={15} />
                <span className="hide-mobile">Search</span>
                <span className="kbd hide-mobile">/</span>
              </button>
              <a
                className="btn btn-blue btn-sm"
                href={SUBSCRIBE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon.youtube size={15} />
                <span className="hide-mobile">Subscribe</span>
              </a>
              <Link to="/owner" className="btn btn-ghost btn-sm hide-mobile">
                Owner
              </Link>
              <button
                className="burger"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <Icon.close size={20} /> : <Icon.menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className={`mobile-nav${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)}>
        <div className="mobile-nav-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Mobile navigation">
          <div className="mobile-nav-head">
            <Logo small />
            <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <Icon.close size={20} />
            </button>
          </div>
          {NAV.map((n) => {
            const Ico = Icon[n.icon] || Icon.grid;
            if (n.children) {
              const isOpen = openGroup === n.label;
              return (
                <div key={n.label} className="mobile-nav-group">
                  <button
                    className={`mobile-nav-link mobile-nav-toggle${isOpen ? ' active' : ''}`}
                    onClick={() => setOpenGroup(isOpen ? null : n.label)}
                    aria-expanded={isOpen}
                  >
                    <Ico size={17} />
                    <span>{n.label}</span>
                    <Icon.chevronDown size={16} style={{ marginLeft: 'auto', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>
                  {isOpen && (
                    <div className="mobile-nav-sub">
                      {n.children.map((c) => (
                        <NavLink
                          key={`${c.to}-${c.label}`}
                          to={c.to}
                          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                        >
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
              >
                <Ico size={17} />
                <span>{n.label}</span>
              </NavLink>
            );
          })}
          <div style={{ height: 8 }} />
          <a className="mobile-nav-link" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
            <Icon.youtube size={17} />
            <span>Subscribe on YouTube</span>
          </a>
          <NavLink to="/owner" className="mobile-nav-link">
            <Icon.lock size={17} />
            <span>Owner Access</span>
          </NavLink>
          <div className="mobile-nav-foot">
            Built for The Tech Guider 01 community.
          </div>
        </div>
      </div>
    </>
  );
}

function AnnouncementBar() {
  const { site } = useSite();
  const announcements = site?.announcements || [];
  if (!announcements.length) return null;
  const [current] = announcements;
  return (
    <div className="announcement-bar" role="region" aria-label="Announcement">
      <div className="container">
        <div className="announcement-inner">
          <Icon.alert size={14} className="flex-shrink" style={{ flexShrink: 0 }} />
          <div className="scroll">
            <strong>{current.title}</strong>
            {current.message ? ` — ${current.message}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery('');
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const data = await publicApi.search(q);
        setResults(data);
      } catch {
        setResults({ error: 'Search is unavailable right now.' });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [query]);

  if (!open) return null;

  const total = results
    ? (results.videos?.length || 0) + (results.resources?.length || 0) +
      (results.minecraft?.length || 0) + (results.tools?.length || 0)
    : 0;

  function go(to) {
    onClose();
    window.location.hash = '';
    window.location.assign(to);
  }

  return (
    <div className="search-modal" role="dialog" aria-modal="true" aria-label="Search" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrap">
          <Icon.search size={18} style={{ color: 'var(--text-3)' }} />
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="Search videos, resources, tools, Minecraft…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the hub"
          />
          {loading && <Spinner label="" />}
          <button className="icon-btn" onClick={onClose} aria-label="Close search">
            <Icon.close size={18} />
          </button>
        </div>

        <div className="search-results">
          {!results && !loading && (
            <div className="search-empty">Try "Minecraft", "Free Fire", or "hosting".</div>
          )}
          {!results && loading && <Spinner />}
          {results && results.error && <div className="search-empty">{results.error}</div>}
          {results && !results.error && total === 0 && (
            <div className="search-empty">No results for "{query}".</div>
          )}
          {results && results.videos?.length > 0 && (
            <SearchGroup label="Videos">
              {results.videos.map((v) => (
                <button key={v.id} className="search-item" onClick={() => go(`/videos/${v.id}`)}>
                  {v.thumbnail ? (
                    <img className="search-item-thumb" src={v.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <span className="search-item-icon">
                      <Icon.video size={17} />
                    </span>
                  )}
                  <span className="search-item-main">
                    <span className="text-sm" style={{ display: 'block', fontWeight: 600 }}>{v.title}</span>
                    <span className="text-xs muted3">{v.category}</span>
                  </span>
                  {v.status === 'coming_soon' && <Icon.dot size={14} style={{ color: 'var(--warning)' }} />}
                </button>
              ))}
            </SearchGroup>
          )}
          {results && results.resources?.length > 0 && (
            <SearchGroup label="Resources">
              {results.resources.map((r) => (
                <button key={r.id} className="search-item" onClick={() => go(`/resources?focus=${r.id}`)}>
                  <span className="search-item-icon">
                    <Icon.resource size={17} />
                  </span>
                  <span className="search-item-main">
                    <span className="text-sm" style={{ display: 'block', fontWeight: 600 }}>{r.name}</span>
                    <span className="text-xs muted3">{r.category}</span>
                  </span>
                </button>
              ))}
            </SearchGroup>
          )}
          {results && results.minecraft?.length > 0 && (
            <SearchGroup label="Minecraft">
              {results.minecraft.map((m) => (
                <button key={m.id} className="search-item" onClick={() => go('/minecraft')}>
                  <span className="search-item-icon">
                    <Icon.minecraft size={17} />
                  </span>
                  <span className="search-item-main">
                    <span className="text-sm" style={{ display: 'block', fontWeight: 600 }}>{m.title}</span>
                    <span className="text-xs muted3">{m.edition} · {m.listing_type}</span>
                  </span>
                </button>
              ))}
            </SearchGroup>
          )}
          {results && results.tools?.length > 0 && (
            <SearchGroup label="Tools">
              {results.tools.map((t) => (
                <button key={t.id} className="search-item" onClick={() => go(t.route)}>
                  <span className="search-item-icon">
                    <Icon.tool size={17} />
                  </span>
                  <span className="search-item-main">
                    <span className="text-sm" style={{ display: 'block', fontWeight: 600 }}>{t.name}</span>
                  </span>
                </button>
              ))}
            </SearchGroup>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchGroup({ label, children }) {
  return (
    <div className="search-group">
      <div className="search-group-label">{label}</div>
      {children}
    </div>
  );
}

function Footer() {
  const { site } = useSite();
  const socials = [
    ['YouTube', socialLink(site, 'youtube'), Icon.youtube],
    ['Discord', socialLink(site, 'discord'), Icon.discord],
    ['Instagram', socialLink(site, 'instagram'), Icon.instagram],
    ['TikTok', socialLink(site, 'tiktok'), Icon.tiktok],
    ['X', socialLink(site, 'x'), Icon.x],
    ['Website', socialLink(site, 'website'), Icon.globe],
  ].filter(([, url]) => url);

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo />
            <p>The Tech Guider 01</p>
            <p>Technology • Gaming • Tutorials • Tools</p>
          </div>
          <div className="footer-col">
            <h5>Explore</h5>
            {[
              ['/resources', 'Resources'],
              ['/videos', 'Videos'],
              ['/tools', 'Tools'],
              ['/minecraft', 'Minecraft'],
              ['/free-fire-sensitivity', 'Free Fire'],
              ['/website-packages', 'Website'],
              ['/games-packages', 'Games'],
              ['/logo-packages', 'Logo'],
              ['/video-editing-packages', 'Video Editing'],
              ['/team', 'Team'],
            ].map(([to, label]) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
          </div>
          <div className="footer-col">
            <h5>Platform</h5>
            {[
              ['/ai', 'The Tech Guider AI'],
              ['/about', 'About'],
              ['/owner', 'Owner Access'],
            ].map(([to, label]) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
            {site?.aiUrl && (
              <a href={site.aiUrl} target="_blank" rel="noopener noreferrer">Open AI Assistant ↗</a>
            )}
          </div>
          <div className="footer-col">
            <h5>Follow</h5>
            <div className="social-row">
              {socials.map(([name, url, IconComp]) => (
                <a
                  key={name}
                  className="social-btn"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  title={name}
                >
                  <IconComp size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} The Tech Guider 01. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useMemo(() => () => setSearchOpen(true), []);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    publicApi.analytics('pageview', location.pathname).catch(() => {});
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <AnnouncementBar />
      <Header onOpenSearch={openSearch} />
      <NavRail />
      <main className="site-main" id="main-content">
        <div className="page-transition" key={location.pathname}>
          {children}
        </div>
      </main>
      <Footer />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

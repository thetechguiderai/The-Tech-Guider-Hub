import React, { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { ownerApi } from '../../api';
import { Icon } from '../../components/ui';

import Overview from './Overview';
import VideosAdmin from './VideosAdmin';
import ResourcesAdmin from './ResourcesAdmin';
import YouTubeAdmin from './YouTubeAdmin';
import TikTokAdmin from './TikTokAdmin';
import SensitivityAdmin from './SensitivityAdmin';
import MinecraftAdmin from './MinecraftAdmin';
import RewardsAdmin from './RewardsAdmin';
import ShopAdmin from './ShopAdmin';
import AnnouncementsAdmin from './AnnouncementsAdmin';
import AnalyticsAdmin from './AnalyticsAdmin';
import AuditAdmin from './AuditAdmin';
import SettingsAdmin from './SettingsAdmin';

const NAV = [
  { group: 'Manage', items: [
    { to: '/owner/dashboard', label: 'Dashboard', icon: Icon.home, end: true },
    { to: '/owner/dashboard/videos', label: 'Videos', icon: Icon.video },
    { to: '/owner/dashboard/resources', label: 'Resources', icon: Icon.resource },
    { to: '/owner/dashboard/youtube', label: 'YouTube', icon: Icon.chart },
    { to: '/owner/dashboard/tiktok', label: 'TikTok', icon: Icon.tiktok },
    { to: '/owner/dashboard/sensitivity', label: 'FF Sensitivity', icon: Icon.tool },
    { to: '/owner/dashboard/minecraft', label: 'Minecraft', icon: Icon.minecraft },
    { to: '/owner/dashboard/rewards', label: 'Rewards', icon: Icon.star },
    { to: '/owner/dashboard/shop', label: 'Shop', icon: Icon.gift },
  ]},
  { group: 'Monitor', items: [
    { to: '/owner/dashboard/announcements', label: 'Announcements', icon: Icon.alert },
    { to: '/owner/dashboard/analytics', label: 'Analytics', icon: Icon.grid },
  ]},
  { group: 'System', items: [
    { to: '/owner/dashboard/social', label: 'Social Links', icon: Icon.link },
    { to: '/owner/dashboard/audit', label: 'Audit Logs', icon: Icon.list },
    { to: '/owner/dashboard/settings', label: 'Settings', icon: Icon.settings },
  ]},
];

const PAGE_TITLES = {
  '/owner/dashboard': 'Overview',
  '/owner/dashboard/videos': 'Video Management',
  '/owner/dashboard/resources': 'Resource Management',
  '/owner/dashboard/youtube': 'YouTube Settings',
  '/owner/dashboard/tiktok': 'TikTok Studio',
  '/owner/dashboard/sensitivity': 'FF Sensitivity Profiles',
  '/owner/dashboard/minecraft': 'Minecraft Management',
  '/owner/dashboard/rewards': 'Reward Inventory',
  '/owner/dashboard/shop': 'Shop Management',
  '/owner/dashboard/announcements': 'Announcements',
  '/owner/dashboard/analytics': 'Analytics',
  '/owner/dashboard/social': 'Social Links & Branding',
  '/owner/dashboard/audit': 'Audit Logs',
  '/owner/dashboard/settings': 'Owner Settings',
};

export default function Dashboard() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const s = await ownerApi.session();
        setAuthed(!!s.authenticated);
      } catch {
        setAuthed(false);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  async function logout() {
    try {
      await ownerApi.logout();
    } catch {
      /* ignore */
    }
    navigate('/owner', { replace: true });
  }

  if (!checked) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!authed) return <Navigate to="/owner" replace />;

  const title =
    PAGE_TITLES[window.location.pathname] ||
    (window.location.pathname.startsWith('/owner/dashboard') ? 'Owner Dashboard' : 'Owner Dashboard');

  return (
    <div className="dash-layout">
      <aside className="dash-side">
        <div className="dash-side-brand">
          <span className="brand-mark" style={{ width: 34, height: 34 }}>
            <Icon.shield size={17} />
          </span>
          <div>
            <div className="brand-text">TECH GUIDER HUB</div>
            <div className="muted3">OWNER</div>
          </div>
        </div>

        <nav className="dash-nav-wrap" aria-label="Owner dashboard" style={{ flex: 1 }}>
          {NAV.map((group) => (
            <React.Fragment key={group.group}>
              <div className="dash-nav-group">{group.group}</div>
              <div className="dash-scroll-nav">
                {group.items.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `dash-nav-item${isActive ? ' active' : ''}`}
                    >
                      <IconComp size={16} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </nav>

        <button className="dash-nav-item" style={{ marginTop: 'auto' }} onClick={logout}>
          <Icon.logout size={16} /> Logout
        </button>
        <Link to="/" className="dash-nav-item">
          <Icon.globe size={16} /> View public site
        </Link>
      </aside>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Owner Dashboard</div>
            <h1 className="dash-title">{title}</h1>
          </div>
          <Link to="/" className="btn btn-ghost btn-sm">
            <Icon.globe size={14} /> View site
          </Link>
        </div>

        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="videos" element={<VideosAdmin />} />
          <Route path="resources" element={<ResourcesAdmin />} />
          <Route path="youtube" element={<YouTubeAdmin />} />
          <Route path="tiktok" element={<TikTokAdmin />} />
          <Route path="sensitivity" element={<SensitivityAdmin />} />
          <Route path="minecraft" element={<MinecraftAdmin />} />
          <Route path="rewards" element={<RewardsAdmin />} />
          <Route path="shop" element={<ShopAdmin />} />
          <Route path="announcements" element={<AnnouncementsAdmin />} />
          <Route path="analytics" element={<AnalyticsAdmin />} />
          <Route path="social" element={<SettingsAdmin />} />
          <Route path="audit" element={<AuditAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { publicApi } from './api';
import { SiteContext } from './context';
import Layout from './components/Layout';

import Home from './pages/Home';
import Resources from './pages/Resources';
import Videos from './pages/Videos';
import VideoDetail from './pages/VideoDetail';
import Tools from './pages/Tools';
import Minecraft from './pages/Minecraft';
import FreeFire from './pages/FreeFire';
import TikTok from './pages/TikTok';
import VideoEditingPackages from './pages/VideoEditingPackages';
import AIWorkspace from './pages/ai/AIWorkspace';
import AIPlans from './pages/ai/AIPlans';
import UserSettings from './pages/ai/UserSettings';
import Auth from './pages/Auth';
import Analytics from './pages/Analytics';
import Support from './pages/Support';
import Shop from './pages/Shop';
import About from './pages/About';
import WebsitePackages from './pages/WebsitePackages';
import GamesPackages from './pages/GamesPackages';
import LogoPackages from './pages/LogoPackages';
import Team from './pages/Team';
import Owner from './pages/Owner';
import Dashboard from './pages/dashboard/Dashboard';
import NotFound from './pages/NotFound';

function useMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', 'description');
        document.head.appendChild(el);
      }
      el.setAttribute('content', description);
    } else if (title) {
      let el = document.querySelector('meta[name="description"]');
      if (el) el.setAttribute('content', 'The official Tech Guider 01 hub for technology, gaming, tutorials, Minecraft, Free Fire and useful digital tools.');
    }
  }, [title, description]);
}
export { useMeta };

export default function App() {
  const [site, setSite] = useState(null);

  useEffect(() => {
    publicApi
      .bootstrap()
      .then(setSite)
      .catch(() => setSite({ sitename: 'The Tech Guider 01' }));
  }, []);

  return (
    <SiteContext.Provider value={{ site }}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/resources" element={<Layout><Resources /></Layout>} />
        <Route path="/videos" element={<Layout><Videos /></Layout>} />
        <Route path="/videos/:id" element={<Layout><VideoDetail /></Layout>} />
        <Route path="/tools" element={<Layout><Tools /></Layout>} />
        <Route path="/free-fire-sensitivity" element={<Layout><FreeFire /></Layout>} />
        <Route path="/minecraft" element={<Layout><Minecraft /></Layout>} />
        <Route path="/tiktok" element={<Layout><TikTok /></Layout>} />
        <Route path="/ai" element={<Layout><AIWorkspace /></Layout>} />
        <Route path="/ai/chat/:conversationId" element={<Layout><AIWorkspace /></Layout>} />
        <Route path="/ai/plans" element={<Layout><AIPlans /></Layout>} />
        <Route path="/ai/settings" element={<Layout><UserSettings /></Layout>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
        <Route path="/support" element={<Layout><Support /></Layout>} />
        <Route path="/shop" element={<Layout><Shop /></Layout>} />
        <Route path="/about" element={<Layout><About /></Layout>} />
        <Route path="/website-packages" element={<Layout><WebsitePackages /></Layout>} />
        <Route path="/games-packages" element={<Layout><GamesPackages /></Layout>} />
        <Route path="/logo-packages" element={<Layout><LogoPackages /></Layout>} />
        <Route path="/video-editing-packages" element={<Layout><VideoEditingPackages /></Layout>} />
        <Route path="/team" element={<Layout><Team /></Layout>} />
        <Route path="/owner" element={<Owner />} />
        <Route path="/owner/dashboard/*" element={<Dashboard />} />
        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </SiteContext.Provider>
  );
}


import React from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context';
import { useMeta } from '../App';
import { SectionHead, Icon } from '../components/ui';

export default function Tools() {
  useMeta('Tools — The Tech Guider Hub', 'Free tools from The Tech Guider: the Free Fire sensitivity generator, Minecraft hub and more.');
  const { site } = useSite();

  const tools = [
    {
      to: '/free-fire-sensitivity',
      icon: Icon.tool,
      title: 'Free Fire Sensitivity Generator',
      desc: 'Generate a sensitivity setup tuned for your device, RAM, refreshrate and play style.',
    },
    {
      to: '/minecraft',
      icon: Icon.minecraft,
      title: 'Minecraft Hub',
      desc: 'Java & Bedrock resources, hosting recommendations, tools and guides.',
    },
    {
      to: '/#youtube-stats',
      icon: Icon.chart,
      title: 'Live YouTube Statistics',
      desc: 'Real-time channel statistics straight from the YouTube Data API.',
    },
    {
      to: '/resources',
      icon: Icon.resource,
      title: 'Video Resources',
      desc: 'Find every tool, host and website referenced in videos.',
    },
    {
      to: '/search-tools',
      icon: Icon.search,
      title: 'Global Search',
      desc: 'Press / or tap Search to look across videos, resources and tools.',
      disable: true,
    },
  ];

  tools.push({
    to: '/ai',
    icon: Icon.ai,
    title: 'The Tech Guider AI',
    desc: 'Open the AI workspace built by The Tech Guider — chat, code and create.',
  });

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <SectionHead
        eyebrow="Toolbox"
        title="Tools"
        sub="Free utilities and quick access for everything the channel covers."
      />
      <div className="grid-cards">
        {tools.map((t) => {
          const IconComp = t.icon;
          const inner = (
            <>
              <div className="flex align-center gap-2">
                <span className="resource-logo fallback" aria-hidden="true">
                  <IconComp size={20} />
                </span>
                <h3 className="resource-name">{t.title}</h3>
              </div>
              <p className="text-sm muted mt-2">{t.desc}</p>
            </>
          );
          if (t.ext) {
            const internal = String(t.ext).startsWith('/');
            return (
              <a
                key={t.title}
                href={t.ext}
                target={internal ? undefined : '_blank'}
                rel={internal ? undefined : 'noopener noreferrer'}
                className="card card-hover"
                style={{ textDecoration: 'none' }}
              >
                {inner}
              </a>
            );
          }
          return t.disable ? (
            <div key={t.title} className="card" aria-disabled="true">
              {inner}
              <span className="text-xs muted3 mt-1" style={{ display: 'block' }}>Available from the navigation bar.</span>
            </div>
          ) : (
            <Link key={t.title} to={t.to} className="card card-hover" style={{ textDecoration: 'none' }}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
import React from 'react';
import { useMeta } from '../App';
import { SectionHead, Badge, Icon } from '../components/ui';

export default function GamesPackages() {
  useMeta(
    'Game Development Packages — The Tech Guider 01',
    'Game development packages from mini games to custom multiplayer platforms.'
  );

  const packages = [
    {
      id: 'mini',
      title: 'Mini Game',
      price: 'Rs. 4,999',
      type: 'one-time',
      features: [
        'Simple 2D game',
        'Basic player movement',
        'Score system',
        'Start, pause and restart',
        'Basic sound effects',
        'One playable level',
        'Windows or web build',
      ],
      bestFor: 'simple arcade games, mini-platformers and student projects',
    },
    {
      id: 'pro2d',
      title: '2D Pro Game',
      price: 'Rs. 12,999',
      type: 'one-time',
      features: [
        'Custom 2D gameplay',
        'Up to 5 levels',
        'Enemies and obstacles',
        'Health and score system',
        'Main menu and settings',
        'Save progress',
        'Sound and music',
        'One target platform',
      ],
      bestFor: 'platformers, top-down games and casual adventures',
    },
    {
      id: 'starter3d',
      title: '3D Starter Game',
      price: 'Rs. 24,999',
      type: 'one-time',
      starting: true,
      features: [
        'Basic 3D environment',
        'Player movement and camera',
        'Simple objectives',
        'Basic collision and physics',
        'Menu and restart system',
        'Basic sound effects',
        'One playable map',
      ],
      bestFor: 'small 3D adventures, obstacle games and prototypes',
    },
    {
      id: 'advanced',
      title: 'Advanced Game',
      price: 'Rs. 49,999+',
      type: 'custom',
      features: [
        'More advanced gameplay',
        'Multiple levels or maps',
        'AI enemies',
        'Inventory or upgrade system',
        'Save/load functionality',
        'Custom UI and audio',
        'Performance optimization',
      ],
      bestFor: 'larger indie games and feature-rich projects',
      note: 'Server costs, hosting and ongoing maintenance are extra. Final scope and price must be agreed before development.',
    },
    {
      id: 'multiplayer',
      title: 'Multiplayer / Custom Game',
      price: 'Rs. 99,999+',
      type: 'project-based',
      features: [
        'Multiplayer architecture',
        'Lobby and matchmaking',
        'Player accounts',
        'Server-side game logic',
        'Database integration',
        'Anti-cheat planning',
        'Deployment and testing',
      ],
      bestFor: 'online multiplayer games and custom game platforms',
      note: 'Server costs, hosting and ongoing maintenance are extra. Final scope and price must be agreed before development.',
    },
  ];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <SectionHead
        eyebrow="Game Development Packages"
        title="From mini games to custom platforms"
        sub="Build your game with a package tailored to your vision and budget."
      />

      <div className="mt-3" style={{ marginTop: 32 }}>
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="card mt-3"
            style={{ marginTop: 28, border: '1px solid var(--border)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold">{pkg.title}</h3>
              <span className="text-2xl font-bold">{pkg.price}</span>
            </div>
            <p className="text-sm text-muted-3 mb-4 capitalize">
              {pkg.type === 'project-based' ? 'Project-based pricing' : pkg.type === 'custom' ? 'Custom quotation required' : 'One-time development fee'}
            </p>
            <ul className="space-y-2 text-sm text-muted">
              {pkg.features.map((feat) => (
                <li key={feat} style={{ listStyle: 'none' }}>
                  <span className="mr-2" style={{ width: 12, height: 12, borderRadius: 50, background: 'var(--accent)', display: 'inline-block' }} aria-hidden="true" />
                  {feat}
                </li>
              ))}
            </ul>
            {pkg.bestFor && (
              <p className="text-xs text-muted-3 mt-3">{pkg.bestFor}</p>
            )}
            {pkg.note && (
              <p className="text-xs text-warning mt-2">{pkg.note}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4" style={{ marginTop: 32 }}>
        <h3 className="font-bold mb-3">Extra Services</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Bug fixes</p>
            <p className="text-muted-3">Rs. 1,000</p>
          </div>
          <div>
            <p className="font-semibold">Additional 2D level</p>
            <p className="text-muted-3">Rs. 1,000</p>
          </div>
          <div>
            <p className="font-semibold">Basic character design</p>
            <p className="text-muted-3">Rs. 1,500</p>
          </div>
          <div>
            <p className="font-semibold">Additional game mode</p>
            <p className="text-muted-3">Rs. 2,000</p>
          </div>
          <div>
            <p className="font-semibold">Android build</p>
            <p className="text-muted-3">Rs. 2,000+</p>
          </div>
          <div>
            <p className="font-semibold">Game icon and cover art</p>
            <p className="text-muted-3">Rs. 1,000</p>
          </div>
          <div>
            <p className="font-semibold">Game updates and maintenance</p>
            <p className="text-muted-3">Rs. 1,500/month</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm text-muted-3">
          <strong>Important:</strong> These are suggested starting prices, not fixed market rates. Asset licensing,
          platform requirements and complexity can change the final quotation. Server costs, hosting and ongoing
          maintenance are extra for multiplayer projects. Final scope and price must be agreed before development.
        </p>
      </div>
    </div>
  );
}
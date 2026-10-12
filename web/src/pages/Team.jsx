import React from 'react';
import { useMeta } from '../App';
import { SectionHead, Badge, Icon } from '../components/ui';

export default function Team() {
  useMeta(
    'Team — The Tech Guider 01',
    'Meet the team behind The Tech Guider 01 hub. Owner, admins, moderators and developers.'
  );

  const teamMembers = [
    {
      role: 'Owner',
      name: 'Muhammad Musa',
      status: 'Active',
      description: 'Founder and lead developer. Responsible for vision, strategy and overall direction of The Tech Guider 01.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Admin',
      name: 'Pending',
      status: 'Needed',
      description: 'Manages user accounts, permissions and community moderation.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Moderator',
      name: 'Pending',
      status: 'Needed',
      description: 'Oversees community discussions, enforces rules and helps members.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Developer',
      name: 'Pending',
      status: 'Needed',
      description: 'Builds and maintains the website, features and integrations.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Staff',
      name: 'Pending',
      status: 'Needed',
      description: 'Assists with daily operations, support and community engagement.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Content Writer',
      name: 'Pending',
      status: 'Open',
      description: 'Creates tutorials, articles and guides for the hub and YouTube channel.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Video Editor',
      name: 'Pending',
      status: 'Open',
      description: 'Edits videos for The Tech Guider 01 YouTube channel and promotional content.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Graphic Designer',
      name: 'Pending',
      status: 'Open',
      description: 'Creates logos, banners, thumbnails and visual assets for the brand.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Social Media Manager',
      name: 'Pending',
      status: 'Open',
      description: 'Manages social media accounts, schedules posts and engages with the community.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
    {
      role: 'Community Manager',
      name: 'Pending',
      status: 'Open',
      description: 'Grows the community, organizes events and fosters engagement across platforms.',
      discord: 'https://discord.gg/dczyhM8ZwV',
    },
  ];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <SectionHead
        eyebrow="The Team"
        title="Join The Tech Guider 01 Team"
        sub="Be part of building the ultimate creator hub for technology, gaming and tutorials."
      />

      <div className="mt-3" style={{ marginTop: 32 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teamMembers.map((member, index) => (
            <div
              key={member.role}
              className="card mt-3 p-6 border"
              style={{
                border: '1px solid #27272a',
                borderRadius: 14,
                background: '#111111',
                transition: 'transform 0.18s cubic-bezier(0.2, 0.65, 0.3, 1)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold {member.status === 'Needed' ? 'text-warning' : 'text-accent-2'}">{member.role}</h3>
                  <p className="text-sm text-muted-3 mt-1">{member.name}</p>
                </div>
                {member.status === 'Needed' && (
                  <span className="text-warning font-bold text-sm">Needed</span>
                )}
              </div>
              <p className="text-sm text-muted-3 mb-4 line-clamp-3">
                {member.description}
              </p>
              {member.status === 'Needed' && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <a
                    href={member.discord}
                    className="btn btn-ghost btn-sm text-warning"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
                  >
                    Contact on Discord
                  </a>
                </div>
              )}
              {member.status === 'Open' && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--accent-border)' }}>
                  <span className="text-accent-2 font-medium text-sm">Position Open</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm text-muted-3">
          <strong>How to Join:</strong> If you are interested in any of the open positions
          (Content Writer, Video Editor, Graphic Designer, Social Media Manager or Community Manager),
          please join our Discord server using the link above and look for the #recruitment channel.
          For the needed roles (Admin, Moderator, Developer, Staff), we are currently reviewing
          applications. Stay tuned for updates!
        </p>
      </div>
    </div>
  );
}
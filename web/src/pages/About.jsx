import React from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context';
import { useMeta } from '../App';
import { SectionHead, Icon } from '../components/ui';

export default function About() {
  useMeta('About — The Tech Guider 01', 'About The Tech Guider 01, the official hub, and the community rules around rewards.');
  const { site } = useSite();

  const steps = [
    ['Watch the required video', 'Find the video linked to the reward or giveaway.'],
    ['Like, comment & subscribe', 'Support the channel with a like, a genuine comment and a subscription.'],
    ['Take a screenshot', 'Capture proof of your comment and subscription. Keep it clear and complete.'],
    ['Submit through Discord', 'Send the screenshot through the designated Discord verification thread only — never to random DMs.'],
    ['Verification approves', 'A human (the owner) checks your entry against the requirements.'],
    ['Reward issued', 'Once approved, the reward/token/code is delivered through the same verified channel.'],
  ];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 840 }}>
      <SectionHead
        eyebrow="The channel"
        title="About The Tech Guider 01"
        sub="Guides, reviews and tools across tech and gaming — with every resource used in the videos kept in one honest, organised place."
      />

      <div className="mt-3" style={{ marginTop: 20 }}>
        <p className="text-sm muted" style={{ lineHeight: 1.75 }}>
          The Tech Guider 01 is the official home for everything the channel shares: the exact websites, hosts
          and tools used in videos, the Free Fire sensitivity generator, the Minecraft section, live channel
          statistics, and the Tech Guider 01 AI assistant.
        </p>
        <p className="text-sm muted" style={{ lineHeight: 1.75, marginTop: 12 }}>
          No affiliate tricks, no hidden agendas. When a service is free, it is labelled free. When a tool gives
          suggestions, you are told it is a suggestion — and you are always encouraged to test in the training
          ground before trusting it in a real match.
        </p>
      </div>

      <div className="card mt-3" style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Community & rewards</h2>
        <p className="text-sm muted" style={{ lineHeight: 1.7 }}>
          The Tech Guider 01 does not pretend to automatically verify subscriptions, likes or comments — YouTube does
          not allow that through a public API in an honest way. Every reward follows a transparent, human-verified
          workflow:
        </p>
        <ol className="text-sm muted" style={{ paddingLeft: 20, margin: '14px 0 0', lineHeight: 1.9 }}>
          {steps.map(([t, d]) => (
            <li key={t}>
              <strong style={{ color: 'var(--text)' }}>{t}:</strong> {d}
            </li>
          ))}
        </ol>
        <p className="text-xs muted3" style={{ lineHeight: 1.7, marginTop: 14 }}>
          Never share your password, login or personal credentials with anyone — including people claiming to be
          from The Tech Guider 01. Credentials are only ever handled privately through the verified Discord workflow,
          and legitimate owners never ask for your password.
        </p>
      </div>

      <div className="card mt-3" style={{ marginTop: 28 }} aria-label="Claim a premium listing">
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Premium listings</h2>
        <p className="text-sm muted" style={{ lineHeight: 1.7 }}>
          Premium items in the Minecraft section are vetted listings, not automatic purchases. Availability,
          price and contact details are managed by the owner directly. Contact through the listed channel and the
          exchange always happens through the verified workflow.
        </p>
      </div>

      <div className="flex gap-2 align-center flex-wrap" style={{ marginTop: 28 }}>
        {site?.social?.youtube && (
          <a className="btn btn-ghost" href={site.social.youtube} target="_blank" rel="noopener noreferrer">
            <Icon.youtube size={16} /> YouTube Channel
          </a>
        )}
        {site?.social?.discord && (
          <a className="btn btn-ghost" href={site.social.discord} target="_blank" rel="noopener noreferrer">
            <Icon.discord size={16} /> Discord Server
          </a>
        )}
        <Link to="/resources" className="btn btn-ghost">
          Explore Resources
        </Link>
      </div>
    </div>
  );
}
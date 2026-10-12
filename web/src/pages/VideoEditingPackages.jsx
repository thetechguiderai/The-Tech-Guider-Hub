import React from 'react';
import { useSite } from '../context';
import { useMeta } from '../App';
import { Badge, Icon, SectionHead } from '../components/ui';
import { DISCORD_DEFAULT } from './FreeFire';

function PackageCard({ pkg }) {
  return (
    <div
      className="card"
      style={{
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        border: pkg.premium ? '1px solid var(--accent)' : '1px solid var(--border)',
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-lg font-bold">{pkg.title}</h3>
        {pkg.premium && <Badge tone="green">Recommended</Badge>}
      </div>
      <div className="text-2xl font-bold">{pkg.price}</div>
      <p className="text-xs muted3" style={{ textTransform: 'capitalize' }}>{pkg.meta}</p>
      <ul style={{ padding: 0, margin: 0 }}>
        {pkg.features.map((feat) => (
          <li key={feat} className="flex" style={{ gap: 10, alignItems: 'flex-start', padding: '5px 0', listStyle: 'none' }}>
            <span style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>
              <Icon.check size={15} />
            </span>
            <span className="text-sm text-muted">{feat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionBlock({ eyebrow, title, sub, packages }) {
  return (
    <div className="mt-4" style={{ marginTop: 36 }}>
      <SectionHead eyebrow={eyebrow} title={title} sub={sub} />
      <div className="grid-cards mt-3" style={{ gap: 16, marginTop: 20 }}>
        {packages.map((p) => (
          <PackageCard key={p.id} pkg={p} />
        ))}
      </div>
    </div>
  );
}

export default function VideoEditingPackages() {
  useMeta(
    'Video Editing Packages — The Tech Guider Hub',
    'Shorts, YouTube, motion edits and monthly video editing packages from The Tech Guider. Contact us on Discord.'
  );
  const { site } = useSite();
  const discord = site?.social?.discord || DISCORD_DEFAULT;

  const shorts = [
    {
      id: 'basic-cut',
      title: 'Basic Cut',
      price: 'Rs. 500',
      meta: 'Shorts & Reels · up to 30s · 2–3 days delivery',
      features: [
        'Basic cuts and transitions',
        'Background music',
        'Simple text overlays',
        '1 revision',
      ],
    },
    {
      id: 'creator-edit',
      title: 'Creator Edit',
      price: 'Rs. 1,000',
      meta: 'Shorts & Reels · up to 60s · 2–3 days delivery',
      premium: true,
      features: [
        'Transitions + zoom effects',
        'Captions & text animations',
        'Music sync + sound effects',
        'Basic color correction',
        '2 revisions',
      ],
    },
    {
      id: 'pro-motion',
      title: 'Pro Motion',
      price: 'Rs. 2,000',
      meta: 'Shorts & Reels · up to 90s · 3–5 days delivery',
      features: [
        'Advanced transitions & motion effects',
        'Animated captions',
        'Color grading + sound design',
        'Custom intro/outro (with your assets)',
        '2 revisions',
      ],
    },
  ];

  const youtube = [
    {
      id: 'yt-basic',
      title: 'Basic YouTube',
      price: 'Rs. 1,500',
      meta: 'Long video · up to 5 min · 3–5 days delivery',
      features: [
        'Cuts, b-roll and pacing edits',
        'Background music',
        'Simple text overlays',
        '1 revision',
      ],
    },
    {
      id: 'yt-creator',
      title: 'Creator YouTube',
      price: 'Rs. 3,000',
      meta: 'Long video · up to 10 min · 4–6 days delivery',
      premium: true,
      features: [
        'Transitions and zoom effects',
        'Captions',
        'Music sync + sound effects',
        'Basic color correction',
        '2 revisions',
      ],
    },
    {
      id: 'yt-pro',
      title: 'Pro YouTube',
      price: 'Rs. 5,000',
      meta: 'Long video · up to 15 min · 5–7 days delivery',
      features: [
        'Full edit: motion graphics + effects',
        'Color grading + sound design',
        'Custom intro/outro',
        '2 revisions',
      ],
    },
  ];

  const monthly = [
    {
      id: 'monthly-starter',
      title: 'Starter',
      price: 'Rs. 1,800/mo',
      meta: '4 Shorts per month · 1 per week',
      features: ['Basic Cut edit per short', '1 revision each', 'Same-week delivery'],
    },
    {
      id: 'monthly-creator',
      title: 'Creator',
      price: 'Rs. 3,500/mo',
      meta: '8 Shorts per month · 2 per week',
      premium: true,
      features: ['Creator Edit per short', '2 revisions each', 'Priority queue'],
    },
    {
      id: 'monthly-growth',
      title: 'Growth',
      price: 'Rs. 5,000/mo',
      meta: '12 Shorts per month · 3 per week',
      features: ['Creator Edit or Pro Motion mix', '2 revisions each', 'Priority queue + best rates'],
    },
  ];

  const extras = [
    ['YouTube thumbnail', 'Rs. 300', 'One custom thumbnail design'],
    ['Custom intro / outro', 'Rs. 500–1,000', 'Motion or text-based intro/outro'],
    ['Extra revision', 'Rs. 200', 'Beyond the included revisions'],
    ['Urgent delivery', 'from Rs. 500 extra', 'Faster turnaround when available'],
  ];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 960 }}>
      <SectionHead
        eyebrow="Video Editing Packages"
        title="Professional edits for shorts, YouTube & reels"
        sub="From quick clean cuts to full motion edits — packages for creators on every budget. Message us on Discord to book a slot."
      />

      <SectionBlock eyebrow="Shorts & Reels" title="Short-form packages" sub="Best for YouTube Shorts, Instagram Reels and TikTok." packages={shorts} />

      <SectionBlock eyebrow="YouTube Videos" title="Long video packages" sub="Full edits for your main channel uploads — you provide the footage." packages={youtube} />

      <SectionBlock eyebrow="Monthly Deals" title="Regular upload support" sub="Perfect if you post shorts every week — cheaper than booking one by one." packages={monthly} />

      <div className="mt-4" style={{ marginTop: 36 }}>
        <h3 className="font-bold mb-3">Extra services</h3>
        <div className="grid grid-cols-2 gap-4">
          {extras.map(([name, price, desc]) => (
            <div key={name}>
              <p className="font-semibold">{name}</p>
              <p className="text-muted-3">{price}</p>
              <p className="text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)', marginTop: 36 }}>
        <p className="text-sm text-muted-3">
          <strong>Notes:</strong> You provide the raw footage (screen recordings, camera clips or downloads).
          Prices are suggested introductory rates — the final quote depends on clip length, effect load and
          difficulty. Delivery time is counted from when we receive all the footage. Extra revisions, custom
          assets and urgent delivery are billed separately.
        </p>
      </div>

      <div className="card" style={{ padding: 28, textAlign: 'center', marginTop: 28 }}>
        <p className="section-sub" style={{ marginBottom: 12 }}>
          Tell us your footage, video length and preferred package on Discord — we reply fast.
        </p>
        <a className="btn btn-primary btn-lg" href={discord} target="_blank" rel="noopener noreferrer">
          <Icon.discord size={18} /> Contact us on Discord
        </a>
      </div>
    </div>
  );
}
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../context';
import { useMeta } from '../App';
import { Badge, Icon, SectionHead } from '../components/ui';
import Sensitivity from './Sensitivity';

const FF_TABS = [
  { key: 'sens', label: 'Sensitivity' },
  { key: 'sale', label: 'ID Sale & Purchase' },
  { key: 'rank', label: 'Rank Push' },
];

const TAB_META = {
  sens: {
    title: 'Free Fire Skills & Services — The Tech Guider Hub',
    description: 'Free Fire sensitivity generator plus trusted FF ID sale & purchase and rank push services from The Tech Guider.',
    head: 'Free Fire Sensitivity',
    sub: 'Generate a sensitivity setup tuned for your device, then fine-tune it in the training ground.',
  },
  sale: {
    title: 'FF ID Sale & Purchase — The Tech Guider Hub',
    description: 'Buy and sell Free Fire IDs safely through The Tech Guider — verified middleman, safe trades only.',
    head: 'FF ID Sale & Purchase',
    sub: 'Buy or sell Free Fire IDs safely. We verify both sides and act as the middleman for high-value deals.',
  },
  rank: {
    title: 'FF ID Rank Push — The Tech Guider Hub',
    description: 'Rank push service for Free Fire — boost to your target rank safely with verified pushers from The Tech Guider.',
    head: 'FF ID Rank Push',
    sub: 'Push your Free Fire ID to the rank you want — fast, safe, and only on your own account.',
  },
};

export const DISCORD_DEFAULT = 'https://discord.gg/eyFK3sQvZ';

function DiscordCta({ url, label = 'Contact us on Discord', sub }) {
  return (
    <div className="card" style={{ padding: 28, textAlign: 'center', marginTop: 24 }}>
      <p className="section-sub" style={{ marginBottom: 12 }}>
        {sub || 'Message us on Discord and tell us your plan — we reply fast.'}
      </p>
      <a className="btn btn-primary btn-lg" href={url} target="_blank" rel="noopener noreferrer">
        <Icon.discord size={18} /> {label}
      </a>
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol style={{ padding: 0, margin: 0, listStyle: 'none' }}>
      {items.map((s, i) => (
        <li key={i} className="flex" style={{ gap: 14, alignItems: 'flex-start', padding: '9px 0' }}>
          <span
            style={{
              minWidth: 26, height: 26, borderRadius: 50, background: 'var(--accent)',
              color: 'var(--bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1,
            }}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="text-sm text-muted">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function RuleItem({ children }) {
  return (
    <li className="flex" style={{ gap: 10, alignItems: 'flex-start', padding: '7px 0', listStyle: 'none' }}>
      <span style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }}>
        <Icon.check size={16} />
      </span>
      <span className="text-sm text-muted">{children}</span>
    </li>
  );
}

function FfSale({ discord }) {
  return (
    <>
      <div className="grid-cards" style={{ gap: 16 }}>
        <div className="card" style={{ padding: 26 }}>
          <h3 className="text-lg font-bold mb-2">
            <span className="flex align-center gap-2">
              <Icon.arrow size={16} /> How it works
            </span>
          </h3>
          <Steps
            items={[
              'Contact us on Discord with "BUY" or "SELL" in your first message.',
              'Sellers: send screenshots of the ID (level, max rank, skins, weapons, diamond count) and your asking price. Buyers: tell us your budget and what you need (rank, skins, weapons).',
              'We verify the account details and connect the buyer with the seller.',
              'Payment is done through the agreed safe method — for high-value IDs we act as the middleman for both sides.',
              'The ID is handed over on Discord. Change the email and password immediately after purchase.',
            ]}
          />
        </div>
        <div className="card" style={{ padding: 26 }}>
          <h3 className="text-lg font-bold mb-2">
            <span className="flex align-center gap-2">
              <Icon.shield size={16} /> Safety rules
            </span>
          </h3>
          <ul style={{ padding: 0, margin: 0 }}>
            <RuleItem>Never share your password before payment is confirmed.</RuleItem>
            <RuleItem>Check linked accounts (Facebook, Google, VK) before buying — the ID must be clean.</RuleItem>
            <RuleItem>Take screenshots of the ID and keep your chat history.</RuleItem>
            <RuleItem>We never ask for login details outside the verified Discord workflow.</RuleItem>
            <RuleItem>Report any scam attempt to us — bad actors get blacklisted.</RuleItem>
          </ul>
          <p className="text-xs muted3 mt-2" style={{ marginTop: 14 }}>
            We only mediate deals for the owner's ID(s) and verified listings — no third-party cash apps beyond agreed safe methods.
          </p>
        </div>
      </div>
      <DiscordCta url={discord} sub="Interested in buying or selling an FF ID? Start the chat on Discord." />
    </>
  );
}

const RANK_TIERS = [
  ['Bronze → Silver', 'from ₹200', 'Quick boost, 1–2 days'],
  ['Silver → Gold', 'from ₹300', '1–2 days'],
  ['Gold → Platinum', 'from ₹500', '2–3 days'],
  ['Platinum → Diamond', 'from ₹800', '3–5 days'],
  ['Diamond → Heroic', 'from ₹1,200', '3–6 days'],
  ['Heroic → Grandmaster', 'from ₹2,000', '4–7 days'],
  ['Grandmaster → Heroic (top)', 'Quote on Discord', 'Depends on points'],
];

function FfRankPush({ discord }) {
  return (
    <>
      <div className="card" style={{ padding: 26 }}>
        <h3 className="text-lg font-bold mb-2">
          <span className="flex align-center gap-2">
            <Icon.star size={16} /> Rank push prices
          </span>
        </h3>
        <p className="text-xs muted3 mb-2" style={{ marginBottom: 16 }}>
          Starting prices only — the exact quote depends on your current points, target rank and how many matches are needed.
        </p>
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {RANK_TIERS.map(([name, price, time]) => (
            <div
              key={name}
              className="flex align-center justify-between flex-wrap gap-2"
              style={{ padding: '12px 2px', borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <span className="font-semibold">{name}</span>
                <span className="text-xs muted3" style={{ display: 'block' }}>{time}</span>
              </div>
              <Badge tone="green">{price}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 26, marginTop: 16 }}>
        <h3 className="text-lg font-bold mb-2">
          <span className="flex align-center gap-2">
            <Icon.tool size={16} /> How the push works
          </span>
        </h3>
        <Steps
          items={[
            'Message us on Discord with your current rank, points and target rank.',
            'We give you an exact quote and a time estimate within a few hours.',
            'You share the ID login temporarily for the push — or we play duo/squad together if you prefer to stay in control.',
            'We push the rank and send screenshots after each milestone.',
            'You change your password right after the push is complete. 50/50 payment split for bigger boosts by mutual agreement.',
          ]}
        />
        <div className="alert mt-2" style={{ marginTop: 16 }}>
          <Icon.alert size={16} />
          <span className="text-sm">
            We only push ranks on your own account. Never share an ID you do not own, and change your password after every boost.
          </span>
        </div>
      </div>
      <DiscordCta url={discord} sub="Tell us your current and target rank on Discord for an exact quote." />
    </>
  );
}

export default function FreeFire() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') || 'sens';
  const active = FF_TABS.some((t) => t.key === raw) ? raw : 'sens';
  const { site } = useSite();
  const discord = site?.social?.discord || DISCORD_DEFAULT;

  useMeta(TAB_META[active].title, TAB_META[active].description);

  function switchTab(key) {
    setParams(key === 'sens' ? {} : { tab: key }, { replace: true });
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 960 }}>
      <SectionHead eyebrow="Free Fire Hub" title={TAB_META[active].head} sub={TAB_META[active].sub} />

      <div className="tabs" role="tablist" aria-label="Free Fire services" style={{ marginTop: 24 }}>
        {FF_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`tab${active === t.key ? ' on' : ''}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'sens' && <Sensitivity embedded />}
      {active === 'sale' && <FfSale discord={discord} />}
      {active === 'rank' && <FfRankPush discord={discord} />}
    </div>
  );
}
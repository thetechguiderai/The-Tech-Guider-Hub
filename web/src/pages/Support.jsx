import React from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../App';
import { useSite } from '../context';
import { Icon, SectionHead } from '../components/ui';
import { SUBSCRIBE_URL } from '../links';

const BUSINESS_EMAIL = 'itxmeshadow1234@gmail.com';

function CopyRow({ label, value }) {
  const [copied, setCopied] = React.useState(false);
  function copy(e) {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }).catch(() => {});
    }
  }
  return (
    <div
      className="search-item"
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer', borderRadius: 12 }}
      onClick={copy}
      onKeyDown={(e) => { if (e.key === 'Enter') copy(e); }}
      title="Click to copy"
    >
      <span className="search-item-symbol" style={{ display: 'none' }} />
      <span className="search-item-main">
        <span className="text-xs muted3" style={{ display: 'block' }}>{label}</span>
        <span className="text-sm" style={{ fontWeight: 700, fontFamily: 'var(--mono)' }}>{value}</span>
      </span>
      <span className="text-xs" style={{ color: copied ? 'var(--success)' : 'var(--muted3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {copied ? <Icon.check size={13} /> : <Icon.copy size={13} />}
        {copied ? 'Copied' : 'Copy'}
      </span>
    </div>
  );
}

export default function Support() {
  useMeta(
    'Donate & Invest — The Tech Guider Hub',
    'Support The Tech Guider: donate for hosting, tools and editing, or invest / partner with the channel and hub.'
  );
  const { site } = useSite();

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 60, maxWidth: 980 }}>
      <SectionHead
        eyebrow="Support"
        title="Donate & Invest"
        sub="The Tech Guider ko grow karne mein madad karein — jo bhi support aata hai wo seedha hosting, tools, cameras aur editing mein jata hai. Har partner ko honest reporting milti hai."
      />

      <div className="grid-2 mt-2" style={{ alignItems: 'start' }}>
        {/* --------- DONATE --------- */}
        <div className="card">
          <h3 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="resource-logo fallback" style={{ width: 32, height: 32, fontSize: 15, display: 'inline-grid' }}>
              <Icon.gift size={16} />
            </span>
            Donate — channel support
          </h3>
          <p className="text-sm muted" style={{ margin: '10px 0 14px' }}>
            Voluntary support hai — kabhi zaroori nahi. Aapke paise se hosting, sensors/apks, editing aur
            new tools free community ke liye aate hain.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CopyRow label="JazzCash (Personal) — name: Rubina Imran" value="03224936337" />
            <CopyRow label="Business email (donation receipt / thanks)" value={BUSINESS_EMAIL} />
          </div>

          <p className="text-xs muted3" style={{ marginTop: 12 }}>
            Bhejne ke baad apna transaction ID + naqsh (purpose) email kar dein — shoutout thanks
            video/comments mein dikhaate hain. Bina samjhe koi info dena zaroori nahi.
          </p>

          <div className="flex gap-2 align-center mt-2" style={{ flexWrap: 'wrap' }}>
            <a className="btn btn-blue btn-sm" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
              <Icon.youtube size={15} /> YouTube Super Thanks / Join
            </a>
            <a
              className="btn btn-ghost btn-sm"
              href={site?.social?.discord ? socialLinkFallback(site) : 'https://discord.gg/'}
              target="_blank" rel="noopener noreferrer" hidden={!site?.social?.discord}
            >
              <Icon.discord size={15} /> Discord community
            </a>
          </div>
        </div>

        {/* --------- INVEST --------- */}
        <div className="card">
          <h3 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="resource-logo fallback" style={{ width: 32, height: 32, fontSize: 15, display: 'inline-grid' }}>
              <Icon.chart size={16} />
            </span>
            Invest / Partner / Sponsorships
          </h3>
          <p className="text-sm muted" style={{ margin: '10px 0 14px' }}>
            The Tech Guider ek growing tech + gaming channel hai with four services aur AI workspace.
            Sponsorships, collaborations aur investments ke liye email karein — detailed deck bheja jata hai.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <CopyRow label="Business / investment email" value={BUSINESS_EMAIL} />
          </div>

          <div className="eyebrow" style={{ margin: '16px 0 8px' }}>Kya offer kar sakte hain</div>
          <ul className="text-sm muted" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
            <li>Video sponsorships (tech, gaming, tutorials)</li>
            <li>Hub banner placement + AI model branding</li>
            <li>TikTok + YouTube cross-promotions</li>
            <li>Service partnerships (editing, logos, websites, games)</li>
          </ul>

          <div className="eyebrow" style={{ margin: '16px 0 8px' }}>Channel services</div>
          <div className="flex gap-2 align-center" style={{ flexWrap: 'wrap' }}>
            <Link to="/video-editing-packages" className="btn btn-ghost btn-sm">Video Editing</Link>
            <Link to="/logo-packages" className="btn btn-ghost btn-sm">Logo Design</Link>
            <Link to="/website-packages" className="btn btn-ghost btn-sm">Websites</Link>
            <Link to="/games-packages" className="btn btn-ghost btn-sm">Games</Link>
            <Link to="/ai/plans" className="btn btn-blue btn-sm">
              <Icon.ai size={14} /> Sponsor the AI
            </Link>
          </div>
        </div>
      </div>

      <div className="state mt-2" style={{ textAlign: 'left' }}>
        <div className="state-icon"><Icon.shield size={20} /></div>
        <div className="state-title">Honesty first</div>
        <p className="state-desc">
          Donations kisi service ki koi guarantee nahi deti. Investment/sponsorship sirf official business
          email par hoti hai — The Tech Guider AI ke assistants kabhi aapse card numbers, OTP ya
          passwords nahi maangte. Koi aisa kare to report karein.
        </p>
      </div>
    </div>
  );
}

function socialLinkFallback(site) {
  return site.social.discord;
}

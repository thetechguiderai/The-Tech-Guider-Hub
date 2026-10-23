import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMeta } from '../App';
import { useSite } from '../context';
import { publicApi } from '../api';
import { Badge, Icon, SectionHead, Spinner, ErrorState } from '../components/ui';
import { socialLink } from '../links';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'awards', label: 'Awards & Rewards' },
  { key: 'promo', label: 'Promo Codes' },
  { key: 'giftcard', label: 'Gift Cards' },
  { key: 'minecraft', label: 'Minecraft Hub' },
  { key: 'ff', label: 'FF ID Trade' },
  { key: 'other', label: 'More' },
];

const CATEGORY_OF = { reward: 'awards', promo: 'promo', giftcard: 'giftcard', service: 'other', other: 'other' };

const AVAIL_TONE = { available: 'green', coming_soon: 'yellow', sold_out: 'red' };
const AVAIL_LABEL = { available: 'Available', coming_soon: 'Coming soon', sold_out: 'Sold out', reserved: 'Reserved' };

const CAT_ICON = {
  awards: <Icon.star size={16} />,
  promo: <Icon.gift size={16} />,
  giftcard: <Icon.gift size={16} />,
  minecraft: <Icon.minecraft size={16} />,
  ff: <Icon.video size={16} />,
  other: <Icon.grid size={16} />,
};

function ItemCard({ title, price, availability, description, linkUrl, footerNote, icon }) {
  const avail = AVAIL_LABEL[availability] || availability || '—';
  const tone = AVAIL_TONE[availability] || 'gray';
  return (
    <div className="card resource-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span className="resource-logo fallback" style={{ width: 34, height: 34, fontSize: 15, display: 'inline-grid', flexShrink: 0 }}>
            {icon || <Icon.gift size={15} />}
          </span>
          <h3 style={{ fontSize: 15.5, margin: 0, minWidth: 0 }}>{title}</h3>
        </div>
        <Badge tone={tone}>{avail}</Badge>
      </div>
      {description && <p className="text-sm muted" style={{ margin: 0, lineHeight: 1.65 }}>{description}</p>}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span className="text-sm" style={{ fontWeight: 700 }}>{price || 'Ask price'}</span>
        {linkUrl ? (
          <a className="btn btn-blue btn-sm" href={linkUrl} target="_blank" rel="noopener noreferrer">
            Open link <Icon.arrow size={13} />
          </a>
        ) : (
          footerNote && <span className="text-xs muted3" style={{ textAlign: 'right' }}>{footerNote}</span>
        )}
      </div>
    </div>
  );
}

function RewardCard({ r }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span className="resource-logo fallback" style={{ width: 34, height: 34, fontSize: 15, display: 'inline-grid', flexShrink: 0 }}>
            <Icon.star size={15} />
          </span>
          <h3 style={{ fontSize: 15.5, margin: 0, minWidth: 0 }}>{r.label}</h3>
        </div>
        <Badge tone={AVAIL_TONE[r.availability] || 'gray'}>{AVAIL_LABEL[r.availability] || r.availability}</Badge>
      </div>
      <p className="text-sm muted" style={{ margin: 0, lineHeight: 1.65 }}>
        {r.code_hint
          ? `Giveaway reward (${r.edition === 'bedrock' ? 'Bedrock' : 'Java'} edition). Code encrypted hai — section flows complete hone ke baad hi deliver hota hai.`
          : `Giveaway reward (${r.edition === 'bedrock' ? 'Bedrock' : 'Java'} edition). Verify hone ke baad deliver hota hai.`}
      </p>
      {r.notes && <p className="text-xs muted3" style={{ margin: 0 }}>{r.notes}</p>}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="text-sm" style={{ fontWeight: 700 }}>{r.price || 'Giveaway'}</span>
        <a className="btn btn-ghost btn-sm" href="/about" style={{ textDecoration: 'none' }}>
          How it works <Icon.arrow size={13} />
        </a>
      </div>
    </div>
  );
}

function MinecraftCard({ m }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span className="resource-logo fallback" style={{ width: 34, height: 34, fontSize: 15, display: 'inline-grid', flexShrink: 0 }}>
            <Icon.minecraft size={15} />
          </span>
          <h3 style={{ fontSize: 15.5, margin: 0, minWidth: 0 }}>{m.title}</h3>
        </div>
        <Badge tone={AVAIL_TONE[m.availability] || 'gray'}>{AVAIL_LABEL[m.availability] || m.availability}</Badge>
      </div>
      <p className="text-sm muted" style={{ margin: 0, lineHeight: 1.65 }}>{m.description}</p>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span className="text-xs muted3">
          {m.edition === 'bedrock' ? 'Bedrock' : 'Java'} · {m.listing_type}
          {m.featured ? ' · ⭐ Featured' : ''}
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          {m.url && (
            <a className="btn btn-blue btn-sm" href={m.url} target="_blank" rel="noopener noreferrer">
              Open <Icon.arrow size={13} />
            </a>
          )}
        </span>
      </div>
      {m.price && <div className="text-sm" style={{ fontWeight: 700 }}>{m.price}</div>}
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="state">
      <div className="state-icon">{icon || <Icon.gift size={20} />}</div>
      <div className="state-title">{title}</div>
      <p className="state-desc">{desc}</p>
    </div>
  );
}

export default function Shop() {
  useMeta(
    'Shop — The Tech Guider Hub',
    'The Tech Guider Shop: awards & rewards, promo codes, gift cards, Minecraft items and FF ID trade — real listings only, from the owner dashboard.'
  );
  const { site } = useSite();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') || 'all';
  const active = TABS.some((t) => t.key === raw) ? raw : 'all';
  const [state, setState] = useState({ loading: true, data: null, error: null });

  async function load() {
    setState({ loading: true, data: null, error: null });
    try {
      setState({ loading: false, data: await publicApi.shop(), error: null });
    } catch {
      setState({ loading: false, data: null, error: 'Shop abhi load nahi ho saka — thori dair baad try karein.' });
    }
  }

  useEffect(() => {
    load();
  }, []);

  function switchTab(key) {
    setParams(key === 'all' ? {} : { tab: key }, { replace: true });
  }

  const items = state.data?.items || [];
  const rewards = state.data?.rewards || [];
  const minecraft = state.data?.minecraft || [];

  const byCat = (key) => items.filter((i) => (CATEGORY_OF[i.category] || 'other') === key);
  const show = (key) => active === 'all' || active === key;
  const discord = socialLink(site, 'discord');

  const ffSteps = [
    'Discord par humein message karein — pehle message mein "BUY" ya "SELL" likhein.',
    'Sellers: ID ke screenshots (level, max rank, skins, weapons, diamonds) aur asking price bhejein.',
    'Buyers: apna budget batayein — matching IDs humein available IDs se dikhayein jate hain.',
    'Deal times: hum middleman hote hain — dono sides verify hoti hain, payment secure rehta hai, scam ki jagah nahi.',
  ];

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 60, maxWidth: 1100 }}>
      <SectionHead
        eyebrow="The Tech Guider Shop"
        title="Shop — sab kuch ek jagah"
        sub="Awards & rewards, promo codes, gift cards, Minecraft items aur FF ID trade. Har listing owner dashboard se aati hai — jo cheez shop mein nahi, wo yahan fake nahi dikhayi jati."
        right={
          <button className="btn btn-ghost btn-sm" onClick={load} aria-label="Refresh shop">
            <Icon.refresh size={14} /> Refresh
          </button>
        }
      />

      <div className="tabs" role="tablist" aria-label="Shop categories" style={{ marginTop: 24 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`tab ${active === t.key ? 'active' : ''}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        {state.loading && <Spinner label="Shop load ho rahi hai…" />}
        {!state.loading && state.error && <ErrorState title="Shop unavailable" desc={state.error} retry={load} />}

        {!state.loading && !state.error && state.data && (
          <>
            {(active === 'awards' || rewards.length > 0) && (
              <section style={{ marginBottom: 26 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><Icon.star size={13} style={{ verticalAlign: -2 }} /> Awards & Rewards</div>
                {rewards.length ? (
                  <div className="grid-cards">
                    {rewards.map((r, i) => <RewardCard key={`r${i}`} r={r} />)}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon.star size={20} />}
                    title="Abhi koi reward active nahi"
                    desc="Rewards owner dashboard se add hote hain jab giveaway live hota hai. Fake reward codes yahan kabhi nahi dikhte — About page par poora process parhein."
                  />
                )}
              </section>
            )}

            {(active === 'promo' || byCat('promo').length > 0) && (
              <section style={{ marginBottom: 26 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><Icon.gift size={13} style={{ verticalAlign: -2 }} /> Promo Codes</div>
                {byCat('promo').length ? (
                  <div className="grid-cards">
                    {byCat('promo').map((it) => (
                      <ItemCard
                        key={it.id}
                        title={it.title}
                        price={it.price}
                        availability={it.availability}
                        description={it.description}
                        linkUrl={it.link_url}
                        icon={CAT_ICON.promo}
                        footerNote="Code deliver hone ke liye Discord par rabta karein"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon.gift size={20} />}
                    title="Abhi koi promo code live nahi"
                    desc="Jub promo code release hoga, yahan uski poori details (discount, validity, kaise use karein) asli mein show hongi. Fake codes list nahi ki jate."
                  />
                )}
              </section>
            )}

            {(active === 'giftcard' || byCat('giftcard').length > 0) && (
              <section style={{ marginBottom: 26 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><Icon.gift size={13} style={{ verticalAlign: -2 }} /> Gift Cards</div>
                {byCat('giftcard').length ? (
                  <div className="grid-cards">
                    {byCat('giftcard').map((it) => (
                      <ItemCard
                        key={it.id}
                        title={it.title}
                        price={it.price}
                        availability={it.availability}
                        description={it.description}
                        linkUrl={it.link_url}
                        icon={CAT_ICON.giftcard}
                        footerNote="Gift card safest delivery — Discord verification ke sath"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon.gift size={20} />}
                    title="Abhi koi gift card stock mein nahi"
                    desc="Gift cards owner approve kare ga phir shop mein aayenge — jab tak real stock nahi, yahan kuch bhi fake nahi dikhaya jata."
                  />
                )}
              </section>
            )}

            {(active === 'minecraft' || minecraft.length > 0) && (
              <section style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="eyebrow"><Icon.minecraft size={13} style={{ verticalAlign: -2 }} /> Minecraft Hub items</div>
                  <a className="text-xs" href="/minecraft" style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                    Full Minecraft page <Icon.arrow size={12} style={{ verticalAlign: -2 }} />
                  </a>
                </div>
                {minecraft.length ? (
                  <div className="grid-cards">
                    {minecraft.map((m) => <MinecraftCard key={`m${m.id}`} m={m} />)}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon.minecraft size={20} />}
                    title="Abhi koi Minecraft listing nahi"
                    desc="Owner dashboard se listings add hote hi yahan real items nazar aayenge."
                  />
                )}
              </section>
            )}

            {show('ff') && (
              <section style={{ marginBottom: 26 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><Icon.video size={13} style={{ verticalAlign: -2 }} /> FF ID Sale & Purchase (safe trade)</div>
                <div className="card">
                  <h3 style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="resource-logo fallback" style={{ width: 32, height: 32, fontSize: 14, display: 'inline-grid' }}>
                      <Icon.shield size={15} />
                    </span>
                    Verified middleman trade — scam ki jagah nahi
                  </h3>
                  <p className="text-sm muted" style={{ margin: '10px 0 14px' }}>
                    The Tech Guider ke through hi ID buy/sell karein: dono sides verify, payment secure, deal times honest.
                    Ye ek asli service hai — automatically koi ID list nahi hoti, har deal Discord par manually hoti hai.
                  </p>
                  <ol className="text-sm muted" style={{ paddingLeft: 20, margin: '0 0 16px', lineHeight: 1.9 }}>
                    {ffSteps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                  {discord ? (
                    <a className="btn btn-blue btn-sm" href={discord} target="_blank" rel="noopener noreferrer">
                      Discord par trade shuru karein <Icon.arrow size={14} />
                    </a>
                  ) : (
                    <EmptyState
                      title="Discord link connect nahi hua"
                      desc="Owner dashboard se Discord link add hote hi yahan direct invite aajayega."
                    />
                  )}
                </div>
              </section>
            )}

            {(active === 'other' || byCat('other').length > 0) && (
              <section style={{ marginBottom: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><Icon.grid size={13} style={{ verticalAlign: -2 }} /> More</div>
                {byCat('other').length ? (
                  <div className="grid-cards">
                    {byCat('other').map((it) => (
                      <ItemCard
                        key={it.id}
                        title={it.title}
                        price={it.price}
                        availability={it.availability}
                        description={it.description}
                        linkUrl={it.link_url}
                        icon={CAT_ICON.other}
                        footerNote="Order — Discord par contact karein"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Icon.grid size={20} />}
                    title="Aur bhi aa raha hai"
                    desc="Naye items (services, bundles, merch waghera) owner add karte hi yahan real listings ban ke aayenge."
                  />
                )}
              </section>
            )}

            {active === 'all' && !items.length && !rewards.length && !minecraft.length && (
              <div className="state mt-2">
                <div className="state-icon"><Icon.gift size={20} /></div>
                <div className="state-title">Shop abhi launch hone wali hai</div>
                <p className="state-desc">
                  Abhi koi bhi item add nahi hua — aur hum yahan koi fake/demo data nahi dikhate.
                  Jub owner dashboard se asli items add honge, wo yahan turant nazar aayenge.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

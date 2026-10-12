import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicApi } from '../api';
import { useMeta } from '../App';
import { SectionHead, Badge, Spinner, ErrorState, EmptyState, Icon } from '../components/ui';

const TYPE_META = {
  hosting: { label: 'Hosting', icon: Icon.globe },
  tool: { label: 'Tool', icon: Icon.tool },
  guide: { label: 'Guide', icon: Icon.video },
  resource: { label: 'Resource', icon: Icon.resource },
  free: { label: 'Free', icon: Icon.check },
  premium: { label: 'Premium', icon: Icon.star },
};

const AVAIL_TONE = {
  available: 'green',
  claimed: 'red',
  limited: 'amber',
  sold_out: 'red',
  coming_soon: 'amber',
};

export default function Minecraft() {
  useMeta('Minecraft Hub — The Tech Guider Hub', 'Minecraft Java & Bedrock resources, hosting, tools and guides.');
  const [searchParams] = useSearchParams();
  const [edition, setEdition] = useState(searchParams.get('edition') === 'bedrock' ? 'bedrock' : 'java');
  const [state, setState] = useState({ loading: true, listings: [], error: null });
  const [type, setType] = useState('all');

  useEffect(() => {
    const e = searchParams.get('edition');
    if (e === 'bedrock' || e === 'java') setEdition(e);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const d = await publicApi.minecraft();
        setState({ loading: false, listings: d.listings, error: null });
      } catch {
        setState({ loading: false, listings: [], error: 'Unable to load Minecraft resources right now.' });
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = state.listings.filter(
      (l) => l.edition === edition || l.edition === 'both'
    );
    if (type !== 'all') {
      const t = type === 'free_listings' ? 'free' : type;
      list = list.filter((l) => l.listing_type === t);
    }
    return list;
  }, [state.listings, edition, type]);

  const freeListings = filtered.filter((l) => l.listing_type === 'free' || (l.listing_type === 'premium' && !l.price));
  const plusListings = filtered.filter((l) => l.listing_type === 'premium' && l.price);

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <SectionHead
        eyebrow="Minecraft"
        title="Minecraft Hub"
        sub="Hosting, tools, guides and carefully vetted listings for Java and Bedrock."
      />

      <div className="tabs" role="tablist" aria-label="Minecraft edition">
        {[
          ['java', 'Java'],
          ['bedrock', 'Bedrock'],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={edition === key}
            className={`tab${edition === key ? ' on' : ''}`}
            onClick={() => setEdition(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chip-select mb-2">
        {[
          ['all', 'All'],
          ['hosting', 'Hosting'],
          ['tool', 'Tools'],
          ['guide', 'Guides'],
          ['resource', 'Resources'],
          ['free_listings', 'Free'],
          ['premium', 'Premium'],
        ].map(([key, label]) => (
          <button key={key} className={`chip${type === key ? ' on' : ''}`} onClick={() => setType(key)}>
            {label}
          </button>
        ))}
      </div>

      {state.loading && <Spinner label="Loading Minecraft resources…" />}
      {state.error && <ErrorState title="Unable to load Minecraft resources" desc={state.error} />}

      {!state.loading && filtered.length === 0 && (
        <EmptyState
          title={`No ${edition} listings yet`}
          desc="New Minecraft resources will appear here as the owner adds them."
        />
      )}

      {filtered.length > 0 && (
        <div className="grid-cards">
          {filtered.map((l) => {
            const meta = TYPE_META[l.listing_type] || TYPE_META.resource;
            const IconComp = meta.icon;
            return (
              <article key={l.id} className="resource-card">
                <div className="flex align-center gap-2">
                  <span className="resource-logo fallback" aria-hidden="true">
                    <IconComp size={20} />
                  </span>
                  <div className="minwidth-0">
                    <h3 className="resource-name">{l.title}</h3>
                    <div className="flex align-center gap-2 text-xs muted3" style={{ marginTop: 4 }}>
                      <span className="nowrap">{meta.label}</span>
                      <span>·</span>
                      <span>{editionLabel(l.edition)}</span>
                    </div>
                  </div>
                </div>
                {l.description && <p className="text-sm muted">{l.description}</p>}
                <div className="flex align-center justify-between flex-wrap gap-2 mt-2">
                  <div className="flex align-center gap-2">
                    <Badge tone={AVAIL_TONE[l.availability] || 'gray'}>{labelAvailability(l.availability)}</Badge>
                    {l.price && <span className="text-sm" style={{ fontWeight: 650 }}>{l.price}</span>}
                  </div>
                  {l.url ? (
                    <a
                      className="visit-link text-sm"
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      Open <Icon.arrow size={13} />
                    </a>
                  ) : l.contact ? (
                    <span className="text-sm muted" title={l.contact}>
                      Contact: {l.contact}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!state.loading && plusListings.length === 0 && filtered.length > 0 && (
        <div className="state mt-3">
          <div className="state-icon">
            <Icon.star size={22} />
          </div>
          <div className="state-title">About premium listings</div>
          <p className="state-desc">
            Any premium accounts listed here are vetted by The Tech Guider and exchanged only through
            the official verification workflow — never sent in public. Claim processes follow the steps
            described on the About page.
          </p>
        </div>
      )}
    </div>
  );
}

function editionLabel(e) {
  if (e === 'both') return 'Java + Bedrock';
  return e === 'bedrock' ? 'Bedrock' : 'Java';
}

function labelAvailability(a) {
  return String(a || 'available').replace(/_/g, ' ');
}
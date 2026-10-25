import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMeta } from '../../App';
import { Icon, ErrorState, Spinner } from '../../components/ui';
import { aiApi } from '../../aiClient';

function money(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 'Free';
  return `Rs ${n.toLocaleString('en-PK')}`;
}

/* Models & Usage — the new direct-model view (no plan subscriptions).
   Free models show daily limits; paid models show their one-time unlock price. */
export default function AIPlans() {
  useMeta('The Tech Guider AI Models & Usage - The Tech Guider Hub', 'All The Tech Guider AI models — Guider Paradise free daily, Guider BuildX free monthly, plus paid one-time unlocks.');
  const [state, setState] = useState({ loading: true, error: null });
  const [models, setModels] = useState([]);
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);
  const [billing, setBilling] = useState(null);

  async function load() {
    setState({ loading: true, error: null });
    try {
      const [modelsRes, meRes] = await Promise.all([
        aiApi.models(),
        aiApi.me().catch(() => ({ user: null })),
      ]);
      setModels(modelsRes.models || []);
      const u = meRes.user || null;
      setUser(u);
      if (u) {
        aiApi.usage().then((d) => setUsage(d)).catch(() => setUsage(null));
        aiApi.billingMethods().then((d) => setBilling(d)).catch(() => setBilling(null));
      }
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: err.message || 'Unable to load models.' });
    }
  }
  useEffect(() => { load(); }, []);

  const billingAvailable = Boolean(billing && billing.methods && billing.methods.length);
  const usedByModel = (id) => usage?.models?.find((u) => u.modelId === id)?.used || 0;

  if (state.loading) {
    return <div className="container" style={{ paddingTop: 56 }}><Spinner label="Loading models…" /></div>;
  }
  if (state.error) {
    return <div className="container" style={{ paddingTop: 56 }}><ErrorState title="Couldn't load models" desc={state.error} retry={load} /></div>;
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 70, maxWidth: 1080 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow mb-2">The Tech Guider AI</div>
          <h1 className="section-title">Models &amp; usage</h1>
          <p className="section-sub">
            Direct models — paid models one-time unlock hote hain (no monthly plans).
            Har model ka apna feature aur rateLimit hai. Sahi limits server se aati hain.
          </p>
        </div>
        <Link to="/ai" className="btn btn-blue btn-lg"><Icon.ai size={18} /> Open chat</Link>
      </div>

      {user ? (
        <div className="aiw-plan-current card" style={{ margin: '22px 0' }}>
          <div>
            <div className="text-xs muted3">Signed in as</div>
            <div style={{ fontWeight: 600 }}>{user.name || user.email}</div>
          </div>
          <div>
            <div className="text-xs muted3">BuildX monthly used</div>
            <div style={{ fontWeight: 600 }}>
              {usage?.buildxMonthlyUsed ?? 0} / 250
              {typeof usage?.buildxMonthlyUsed === 'number' && usage.buildxMonthlyUsed >= 250 ? ' (limit reached — unlock for unlimited)' : ''}
            </div>
          </div>
          <div>
            <div className="text-xs muted3">Credits</div>
            <div style={{ fontWeight: 600 }}>{user.credits || 0}</div>
          </div>
        </div>
      ) : (
        <div className="aiw-plan-current card" style={{ margin: '22px 0' }}>
          <div className="text-sm muted">You are not signed in. <Link to="/auth">Sign in</Link> to track your usage, keep chat history aur BuildX use karein.</div>
        </div>
      )}

      <div className="aiw-plans">
        {models.map((m) => {
          const locked = Boolean(m.locked && m.enabled !== false);
          const priceLabel = m.tier === 'paid'
            ? (m.unlocked ? 'Unlocked' : `${money(m.price)} one-time`)
            : 'Free';
          return (
            <div key={m.id} className={`card aiw-plan${!locked && m.enabled !== false ? ' current' : ''}`}>
              <div className="aiw-plan-head">
                <h3>{m.badge} {m.name}</h3>
                {locked && <span className="badge badge-blue">🔒 Locked</span>}
              </div>
              <div className="aiw-plan-price">
                <span>{priceLabel}</span>
              </div>
              <p className="text-sm muted" style={{ marginTop: 10 }}>{m.desc}</p>
              <ul className="aiw-plan-features">
                {m.id === 'guider-buildx' ? (
                  <>
                    <li>✅ Free: 250 messages / month</li>
                    <li>✅ Paid unlock: unlimited</li>
                  </>
                ) : (
                  <li><Icon.check size={14} /> {m.tier === 'paid' ? 'One-time unlock = lifetime unlimited' : `Daily limit: ${m.dailyLimit} messages`}</li>
                )}
              </ul>
              {user && !locked && (
                <div className="aiw-plan-usage text-xs muted3">
                  Used today: {usedByModel(m.id)}
                </div>
              )}
              { locked && m.enabled !== false && (
                <Link to={`/ai/unlock/${m.id}`} className="btn btn-blue aiw-plan-unlock" style={{ marginTop: 12 }}>
                  🔓 Unlock for {money(m.price)}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>How unlocks work</h3>
        {billingAvailable ? (
          <p className="text-sm muted" style={{ margin: 0 }}>
            Paid models use manual JazzCash / bank transfer proof review — model unlocks
            once the owner approves it. No card data needed.
          </p>
        ) : (
          <p className="text-sm muted" style={{ margin: 0 }}>
            <strong>Unlocking unavailable right now:</strong> no payment methods yet — owner panel mein methods add karein. Free daily models still work.
          </p>
        )}
      </div>
    </div>
  );
}

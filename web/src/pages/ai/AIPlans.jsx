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

export default function AIPlans() {
  useMeta('AI Plans & Usage — The Tech Guider Hub', 'Plans, limits and usage for The Tech Guider AI.');
  const [state, setState] = useState({ loading: true, error: null });
  const [plans, setPlans] = useState([]);
  const [models, setModels] = useState([]);
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);
  const [billing, setBilling] = useState(null);

  async function load() {
    setState({ loading: true, error: null });
    try {
      const [plansRes, modelsRes, meRes] = await Promise.all([
        aiApi.plans(),
        aiApi.models(),
        aiApi.me().catch(() => ({ user: null })),
      ]);
      setPlans(plansRes.plans || []);
      setModels(modelsRes.models || []);
      const u = meRes.user || null;
      setUser(u);
      if (u) {
        aiApi.usage().then((d) => setUsage(d)).catch(() => setUsage(null));
        aiApi.billingMethods().then((d) => setBilling(d)).catch(() => setBilling(null));
      }
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: err.message || 'Unable to load plans.' });
    }
  }
  useEffect(() => { load(); }, []);

  const modelName = (id) => models.find((m) => m.id === id)?.name || id;
  const billingAvailable = Boolean(billing && billing.methods && billing.methods.length);
  const usedByModel = (id) => usage?.models?.find((u) => u.modelId === id)?.used || 0;

  if (state.loading) {
    return <div className="container" style={{ paddingTop: 56 }}><Spinner label="Loading plans…" /></div>;
  }
  if (state.error) {
    return <div className="container" style={{ paddingTop: 56 }}><ErrorState title="Couldn't load plans" desc={state.error} retry={load} /></div>;
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 70, maxWidth: 1080 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow mb-2">The Tech Guider AI</div>
          <h1 className="section-title">Plans &amp; usage</h1>
          <p className="section-sub">
            Real prices and daily limits, straight from the server. Paid models unlock on the plan
            that includes them — nothing is charged automatically.
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
            <div className="text-xs muted3">Current plan</div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{user.plan || 'free'}</div>
          </div>
          <div>
            <div className="text-xs muted3">Credits</div>
            <div style={{ fontWeight: 600 }}>{user.credits || 0}</div>
          </div>
        </div>
      ) : (
        <div className="aiw-plan-current card" style={{ margin: '22px 0' }}>
          <div className="text-sm muted">You are not signed in. <Link to="/ai">Sign in</Link> to use paid models and track usage.</div>
        </div>
      )}

      <div className="aiw-plans">
        {plans.map((p) => {
          const isCurrent = user && (user.plan || 'free') === p.id;
          return (
            <div key={p.id} className={`card aiw-plan${isCurrent ? ' current' : ''}`}>
              <div className="aiw-plan-head">
                <h3>{p.name}</h3>
                {isCurrent && <span className="badge badge-blue">Current</span>}
                {!p.enabled && <span className="badge">Unavailable</span>}
              </div>
              <div className="aiw-plan-price">
                {p.id === 'free' ? (
                  <span>Free</span>
                ) : (
                  <>
                    <span className="aiw-plan-amount">{money(p.monthly)}</span>
                    <span className="aiw-plan-per">/month</span>
                  </>
                )}
              </div>
              {p.id !== 'free' && p.yearly > 0 && (
                <div className="aiw-plan-yearly">{money(p.yearly)} / year</div>
              )}
              <p className="text-sm muted" style={{ marginTop: 10 }}>{p.desc}</p>
              <ul className="aiw-plan-features">
                {(p.features || p.unlocks || []).length === 0 && <li className="muted3">Free daily models only</li>}
                {(p.features || p.unlocks || []).map((f) => (
                  <li key={f}><Icon.check size={14} /> {modelName(f)}</li>
                ))}
              </ul>
              {user && usage && (p.features || p.unlocks || []).length > 0 && (
                <div className="aiw-plan-usage text-xs muted3">
                  {(p.features || p.unlocks || []).map((f) => (
                    <div key={f}>{modelName(f)} used today: {usedByModel(f)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 17, marginBottom: 8 }}>How upgrades work</h3>
        {billingAvailable ? (
          <p className="text-sm muted" style={{ margin: 0 }}>
            Payments are reviewed manually. Open the AI billing page to pick a payment method,
            submit your transaction reference and proof — access is granted after the owner reviews it.
            {' '}<a href="/ai/plans.html">Go to billing</a>.
          </p>
        ) : (
          <p className="text-sm muted" style={{ margin: 0 }}>
            <strong>Upgrade unavailable right now:</strong> no payment methods are configured on the
            server yet, so paid plans cannot be purchased. Your free daily models still work.
          </p>
        )}
      </div>
    </div>
  );
}

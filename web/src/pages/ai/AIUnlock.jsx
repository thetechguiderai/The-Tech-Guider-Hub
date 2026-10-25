import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMeta } from '../../App';
import { aiApi, aiErrorMessage } from '../../aiClient';

const badRequest = 'Unable to load this model.';

/* One-time per-model unlock page: fixed PKR price, JazzCash/bank proof,
   owner approves, model unlocks forever. No plans involved. */
export default function AIUnlock() {
  useMeta('Unlock a Model — The Tech Guider AI', 'One-time unlock for a paid The Tech Guider AI model via JazzCash / bank transfer with manual owner approval.');
  const { modelId } = useParams();

  const [model, setModel] = useState(undefined); // undefined loading, null unknown
  const [locked, setLocked] = useState(undefined);
  const [methods, setMethods] = useState([]);
  const [user, setUser] = useState(null);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proofRef, setProofRef] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const proofInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    aiApi.models().then((data) => {
      if (!alive) return;
      const m = (data.models || []).find((x) => x.id === modelId);
      if (!m || m.tier !== 'paid' || m.price == null) { setModel(null); return; }
      setModel(m);
      setLocked(m.locked);
    }).catch(() => alive && setModel(null));
    aiApi.billingMethods().then((data) => {
      if (!alive) return;
      const list = data.methods || [];
      setMethods(list);
      const firstProof = list.find((m) => m.proof_required);
      setPaymentMethodId((firstProof || list[0])?.id || '');
    }).catch(() => {});
    aiApi.me().then((data) => { if (alive) setUser(data.user || null); }).catch(() => alive && setUser(null));
    return () => { alive = false; };
  }, [modelId]);

  const chosenMethod = useMemo(() => methods.find((m) => m.id === paymentMethodId) || null, [methods, paymentMethodId]);

  function onSelectMethod(e) {
    const next = e.target.value;
    setPaymentMethodId(next);
    if (methods.find((m) => m.id === next)?.proof_required == null) setProofRef('');
  }

  async function onProofFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    setMessage('Proof upload ho raha hai…');
    try {
      const data = await aiApi.paymentProofUpload(file);
      setProofRef(data.proofReference || '');
      setMessage(`Proof attached: ${data.filename}`);
    } catch (err) {
      setMessage('');
      setError(aiErrorMessage(err) || err.message);
    } finally {
      e.target.value = '';
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!user) { setError('Pehle sign in karein — unlock aap ke account se hoga.'); return; }
    if (locked === false) { setMessage('Ye model already unlocked hai!'); return; }
    if (chosenMethod?.proof_required && !proofRef) { setError('Pehle payment proof upload karein.'); return; }
    setSubmitting(true);
    try {
      const data = await aiApi.modelCheckout({ modelId, paymentMethodId, transactionId, proofReference: proofRef });
      setMessage(`Payment submitted (ID: ${data.payment.id}). Owner approval ke baad aap ka model unlock ho jayega. Aap / OWNER ko JazzCash ki rasid bhej sakte hain.`);
    } catch (err) {
      setError(aiErrorMessage(err) || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (model === undefined) {
    return <div className="aiw-loading"><div className="spinner" /><span>Loading model…</span></div>;
  }
  if (model === null) {
    return (
      <div className="aiw-unlock-page">
        <div className="aiw-unlock-card">
          <h1>Model not found</h1>
          <p>{badRequest || 'Ye model unlock ke liye available nahi.'}</p>
          <Link to="/ai" className="aiw-linkbtn">← Back to chat</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="aiw-unlock-page">
      <div className="aiw-unlock-card">
        <Link to="/ai" className="aiw-linkbtn aiw-unlock-back">← Back to chat</Link>
        <div className="aiw-unlock-badge">{model.badge} {model.name}</div>
        <h1>Unlock “{model.name}”</h1>
        <p className="aiw-unlock-meta">
          One-time price <strong>Rs {model.price}</strong> — payment approve hone ke baad ye model{' '}
          <strong>lifetime unlimited</strong> unlocked rahega.
          {model.id === 'guider-buildx' && (
            <> (Free tier already hai — 250 msg/month. Paid unlock unlimited de deta hai.)</>
          )}
        </p>

        {!user && (
          <div className="aiw-alert">
            Unlock aap ke account se hoga — pehle <Link to="/auth">sign in</Link> karein.
          </div>
        )}

        <form className="aiw-unlock-form" onSubmit={submit}>
          <label>
            Pay via
            <select value={paymentMethodId} onChange={onSelectMethod}>
              {methods.length === 0 && <option value="">Loading methods…</option>}
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>

          {chosenMethod?.instructions && (
            <div className="aiw-unlock-instructions">
              {chosenMethod.instructions.split('\n').filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}

          <label>
            Transaction / Reference ID
            <input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Pehalti ki JazzCash reference / TID likhein"
              required
            />
          </label>

          <label>
            Proof (screenshot / receipt — PNG, JPEG, WEBP, PDF, max 2 MB)
            <button type="button" className="aiw-unlock-proof-btn" onClick={() => proofInputRef.current?.click()}>
              {proofRef ? '✓ Proof attached' : (chosenMethod?.proof_required ? 'Upload proof' : 'Upload proof (optional)')}
            </button>
            <input ref={proofInputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" onChange={onProofFile} style={{ display: 'none' }} />
          </label>

          {message && <div role="status" className="aiw-unlock-success">✓ {message}</div>}
          {error && <div role="alert" className="aiw-alert">{error}</div>}

          {locked === false ? (
            <p className="aiw-unlock-note ok">🎉 Ye model aap ke paas already unlocked hai — enjoy!</p>
          ) : (
            <button type="submit" className="aiw-unlock-submit" disabled={submitting || !user}>
              {submitting ? 'Submitting…' : `Submit Rs ${model.price} payment`}
            </button>
          )}

          <p className="aiw-unlock-note">
            Payment review manual hota hai (owner panel). Approve hone ke baad model aap ke menu mein
            unlock ho jata hai. Koi card number / OTP nahi — sirf JazzCash / bank proof.
          </p>
        </form>
      </div>
    </div>
  );
}

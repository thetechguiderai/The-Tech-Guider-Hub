import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal } from './dash';

const TONE = { pending: 'amber', approved: 'green', rejected: 'red' };

export default function CoinRequestsAdmin() {
  const [state, setState] = useState({ loading: true, requests: [], error: null });
  const [deciding, setDeciding] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const d = await ownerApi.coinRequests();
      setState({ loading: false, requests: d.requests, error: null });
    } catch {
      setState({ loading: false, requests: [], error: 'Unable to load TTG requests.' });
    }
  }

  useEffect(() => { load(); }, []);

  async function decide(action, note) {
    setSaving(true);
    try {
      await ownerApi.decideCoinRequest(deciding.id, action, note);
      setDeciding(null);
      setNotice(`Request #${deciding.id} ${action === 'approve' ? 'approve' : 'reject'} ho gayi${action === 'reject' ? ' — TTGs user ko wapas kar diye.' : '.'}`);
      setTimeout(() => setNotice(null), 3500);
      await load();
    } catch (e) {
      setNotice(e.message || 'Decision failed.');
    } finally {
      setSaving(false);
    }
  }

  const pending = state.requests.filter((r) => r.status === 'pending');

  return (
    <div>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">
          Users roz Daily Mission complete karke TTG kamate hain aur paid items par discount lete hain. Approve hone par voucher code user ke wallet mein deliver hota hai
          Reject par TTG user ko wapas mil jate hain.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <Icon.refresh size={14} /> Refresh
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load requests" desc={state.error} retry={load} />}

      {!state.loading && state.requests.length === 0 && (
        <EmptyState title="Koi TTG request nahi" desc="Jub koi user TTG se discount request kare ga, wo yahan pending list mein aayegi." />
      )}

      {!state.loading && state.requests.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Item</th>
                <th>TTG</th>
                <th>Status</th>
                <th>Discount</th>
                <th>Requested</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.requests.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{r.email || r.user_id}</span>
                    {r.source === 'reward' && <span className="text-xs muted3" style={{ display: 'block' }}>reward #{r.source_id}</span>}
                    {r.source === 'shop' && <span className="text-xs muted3" style={{ display: 'block' }}>shop #{r.source_id}</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.title}</td>
                  <td>🎖 {r.cost} TTG</td>
                  <td><Badge tone={TONE[r.status] || 'gray'}>{r.status}</Badge></td>
                  <td className="text-sm muted">{r.discount_percent ? `${r.discount_percent}% off` : (r.note || '—')}</td>
                  <td className="text-sm muted">{r.created_at?.slice(0, 16).replace('T', ' ')}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-accent btn-sm" onClick={() => setDeciding({ ...r, action: 'approve' })}>Approve</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setDeciding({ ...r, action: 'reject' })}>Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deciding && (
        <Modal
          title={deciding.action === 'approve' ? `Approve: ${deciding.title}` : `Reject: ${deciding.title}`}
          onClose={() => setDeciding(null)}
          footer={
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeciding(null)}>Cancel</button>
              <button
                className="btn btn-accent btn-sm"
                onClick={() => decide(deciding.action, deciding.note || '')}
                disabled={saving}
              >
                {saving ? 'Saving…' : deciding.action === 'approve' ? 'Approve & issue voucher' : 'Reject & refund TTG'}
              </button>
            </>
          }
        >
          <p className="text-sm muted">
            User <strong>{deciding.email || deciding.user_id}</strong> — 🎖 {deciding.cost} TTG — <strong>{deciding.title}</strong>
            {deciding.discount_percent ? ` (${deciding.discount_percent}% off)` : ''}.
          </p>
          {deciding.action === 'approve' && (
            <p className="text-xs muted3" style={{ margin: '10px 0' }}>
              Approve hone par user ke wallet mein <strong>TTG-{`{code}`}</strong> voucher khud deliver ho jata hai — user wo code aapko
              payment ke waqt dega aur discounted price lag jayegi.
            </p>
          )}
          {deciding.action === 'reject' && (
            <p className="text-xs muted3" style={{ margin: '10px 0' }}>
              Reject karne par {deciding.cost} TTG user ke wallet mein wapas add ho jate hain.
            </p>
          )}
          <div className="field">
            <label className="field-label">Note to user (optional)</label>
            <textarea
              className="textarea"
              value={deciding.note || ''}
              onChange={(e) => setDeciding((d) => ({ ...d, note: e.target.value }))}
              placeholder="e.g. Delivered via Discord / Please re-verify your account"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

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
      setState({ loading: false, requests: [], error: 'Unable to load coin requests.' });
    }
  }

  useEffect(() => { load(); }, []);

  async function decide(action, note) {
    setSaving(true);
    try {
      await ownerApi.decideCoinRequest(deciding.id, action, note);
      setDeciding(null);
      setNotice(`Request #${deciding.id} ${action === 'approve' ? 'approve' : 'reject'} ho gayi${action === 'reject' ? ' — coins user ko wapas kar diye.' : '.'}`);
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
          Users roz check-in karke coins kamate hain aur shop items redeem karte hain. Approve hone par item deliver hota hai
          (reward code khud system deliver karta hai agar maujood ho). Reject par coins user ko wapas mil jate hain.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <Icon.refresh size={14} /> Refresh
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load requests" desc={state.error} retry={load} />}

      {!state.loading && state.requests.length === 0 && (
        <EmptyState title="Koi redeem request nahi" desc="Jub koi user coins se shop item redeem kare ga, request yahan pending list mein aayegi." />
      )}

      {!state.loading && state.requests.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Item</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Note</th>
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
                  <td>🪙 {r.cost}</td>
                  <td><Badge tone={TONE[r.status] || 'gray'}>{r.status}</Badge></td>
                  <td className="text-sm muted">{r.note || '—'}</td>
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
                {saving ? 'Saving…' : deciding.action === 'approve' ? 'Approve & deliver' : 'Reject & refund coins'}
              </button>
            </>
          }
        >
          <p className="text-sm muted">
            User <strong>{deciding.email || deciding.user_id}</strong> — 🪙 {deciding.cost} coins — <strong>{deciding.title}</strong>.
          </p>
          {deciding.action === 'approve' && (
            <p className="text-xs muted3" style={{ margin: '10px 0' }}>
              Reward user ke wallet mein code deliver ho jata hai (agar code stored hai). Warna Discord par deliver karein.
            </p>
          )}
          {deciding.action === 'reject' && (
            <p className="text-xs muted3" style={{ margin: '10px 0' }}>
              Reject karne par {deciding.cost} coins user ke wallet mein wapas add ho jate hain.
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

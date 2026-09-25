import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal, Confirm, Field } from './dash';

const TONE = { available: 'green', limited: 'amber', coming_soon: 'amber', claimed: 'red', sold_out: 'red' };

const EMPTY = {
  label: '', code: '', edition: 'java', price: '', availability: 'available', notes: ''
};

export default function RewardsAdmin() {
  const [state, setState] = useState({ loading: true, rewards: [], error: null });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const d = await ownerApi.rewards();
      setState({ loading: false, rewards: d.rewards, error: null });
    } catch {
      setState({ loading: false, rewards: [], error: 'Unable to load rewards.' });
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await ownerApi.updateReward(editing.id, editing);
      else await ownerApi.createReward(editing);
      setEditing(null);
      setNotice('Saved.');
      setTimeout(() => setNotice(null), 2500);
      await load();
    } catch (e) {
      setNotice(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await ownerApi.deleteReward(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setNotice(e.message || 'Delete failed.');
      setDeleting(null);
    }
  }

  async function reveal(r) {
    try {
      const d = await ownerApi.revealReward(r.id);
      setEditing({ reveal: d.code, label: r.label, id: r.id });
    } catch (e) {
      setNotice(e.message || 'Could not reveal.');
    }
  }

  const patch = (k, val) => setEditing((e) => ({ ...e, [k]: val }));

  return (
    <div>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">
          Reward tokens and sensitive codes, stored encrypted server-side. They are never shown on the public site — only the masked hint appears to you here.
        </p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          <Icon.plus size={14} /> Add reward
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load rewards" desc={state.error} retry={load} />}

      {!state.loading && state.rewards.length === 0 && (
        <EmptyState title="Reward inventory is empty" desc="Add claimable tokens or codes here. They are released through the verification workflow." action={
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>Add reward</button>
        } />
      )}

      {!state.loading && state.rewards.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Code hint</th>
                <th>Edition</th>
                <th>Availability</th>
                <th>Price</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.rewards.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.label}</td>
                  <td className="mono text-sm muted">{r.code_hint || '—'}</td>
                  <td className="text-sm muted capitalize">{r.edition}</td>
                  <td><Badge tone={TONE[r.availability] || 'gray'}>{r.availability.replace('_', ' ')}</Badge></td>
                  <td className="text-sm muted">{r.price || '—'}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title="Reveal code" onClick={() => reveal(r)}>
                        <Icon.eye size={16} />
                      </button>
                      <button className="icon-btn" title="Edit" onClick={() => setEditing({ ...r })}>
                        <Icon.edit size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(r)}>
                        <Icon.trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && editing.reveal !== undefined && (
        <Modal title="Reveal reward code" onClose={() => setEditing(null)}>
          <p className="text-sm muted">The code for <strong>{editing.label}</strong> is:</p>
          <div
            className="input mono"
            style={{ fontSize: 16, margin: '10px 0', display: 'block', wordBreak: 'break-all', letterSpacing: '0.05em' }}
          >
            {editing.reveal || <span className="muted3">(no code stored)</span>}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (editing.reveal) {
                navigator.clipboard?.writeText(editing.reveal);
              }
            }}
          >
            <Icon.copy size={13} /> Copy
          </button>
        </Modal>
      )}

      {editing && editing.reveal === undefined && (
        <Modal title={editing.id ? 'Edit reward' : 'Add reward'} onClose={() => setEditing(null)}>
          <Field label="Label" hint="required — what this reward is">
            <input className="input" value={editing.label} onChange={(e) => patch('label', e.target.value)} />
          </Field>
          <Field label="Reward code / token" hint="encrypted before storage; leave empty to keep the current code">
            <input className="input" value={editing.code} onChange={(e) => patch('code', e.target.value)} placeholder="Claim token or account code" />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Edition</label>
              <select className="select" value={editing.edition} onChange={(e) => patch('edition', e.target.value)}>
                <option value="java">Java</option>
                <option value="bedrock">Bedrock</option>
                <option value="both">Both</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Availability</label>
              <select className="select" value={editing.availability} onChange={(e) => patch('availability', e.target.value)}>
                {Object.keys(TONE).map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Price</label>
              <input className="input" value={editing.price} onChange={(e) => patch('price', e.target.value)} placeholder="Free / $2" />
            </div>
          </div>
          <Field label="Notes">
            <textarea className="textarea" value={editing.notes} onChange={(e) => patch('notes', e.target.value)} />
          </Field>
          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !editing.label.trim()}>
              {saving ? 'Saving…' : 'Save reward'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete reward "${deleting.label}"? Its code will be permanently removed.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal, Confirm, Field } from './dash';

const TYPES = ['website', 'video', 'maintenance', 'event'];
const TONE = { website: 'blue', video: 'green', maintenance: 'amber', event: 'gray' };

const EMPTY = {
  title: '', message: '', ann_type: 'website',
  start_date: new Date().toISOString().slice(0, 10), end_date: '', active: true,
};

export default function AnnouncementsAdmin() {
  const [state, setState] = useState({ loading: true, announcements: [], error: null });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const d = await ownerApi.announcements();
      setState({ loading: false, announcements: d.announcements, error: null });
    } catch {
      setState({ loading: false, announcements: [], error: 'Unable to load announcements.' });
    }
  }

  useEffect(() => { load(); }, []);

  // Quick action support: /owner/dashboard/announcements?new=1 opens the create modal
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setEditing({ ...EMPTY });
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await ownerApi.updateAnnouncement(editing.id, editing);
      else await ownerApi.createAnnouncement(editing);
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
      await ownerApi.deleteAnnouncement(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setNotice(e.message || 'Delete failed.');
      setDeleting(null);
    }
  }

  const patch = (k, val) => setEditing((e) => ({ ...e, [k]: val }));

  return (
    <div style={{ maxWidth: 860 }}>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">Banners shown to visitors on the top announcement bar (only while active and within its date range).</p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          <Icon.plus size={14} /> Add announcement
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load announcements" desc={state.error} retry={load} />}

      {!state.loading && state.announcements.length === 0 && (
        <EmptyState title="No announcements" desc="Create website notices, video announcements, maintenance notices or special events." action={
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>Add announcement</button>
        } />
      )}

      {!state.loading && state.announcements.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Announcement</th>
                <th>Type</th>
                <th>Active window</th>
                <th>Active</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.announcements.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td><Badge tone={TONE[a.ann_type] || 'gray'}>{a.ann_type}</Badge></td>
                  <td className="text-sm muted">{a.start_date}{a.end_date ? ` → ${a.end_date}` : ''}</td>
                  <td>{a.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title="Edit" onClick={() => setEditing({ ...a })}>
                        <Icon.edit size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(a)}>
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

      {editing && (
        <Modal title={editing.id ? 'Edit announcement' : 'Add announcement'} onClose={() => setEditing(null)}>
          <Field label="Title" hint="required">
            <input className="input" value={editing.title} onChange={(e) => patch('title', e.target.value)} />
          </Field>
          <Field label="Message">
            <textarea className="textarea" value={editing.message} onChange={(e) => patch('message', e.target.value)} />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Type</label>
              <select className="select" value={editing.ann_type} onChange={(e) => patch('ann_type', e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label className="checkbox-row" style={{ paddingTop: 8, alignSelf: 'center' }}>
              <input type="checkbox" checked={editing.active} onChange={(e) => patch('active', e.target.checked)} />
              Active
            </label>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Start date</label>
              <input className="input" type="date" value={editing.start_date} onChange={(e) => patch('start_date', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">End date <span className="muted3">(optional)</span></label>
              <input className="input" type="date" value={editing.end_date} onChange={(e) => patch('end_date', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !editing.title.trim()}>
              {saving ? 'Saving…' : 'Save announcement'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete announcement "${deleting.title}"?`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
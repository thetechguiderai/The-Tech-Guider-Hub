import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal, Confirm, Field, intOr } from './dash';

const EDITIONS = ['java', 'bedrock', 'both'];
const TYPES = ['resource', 'hosting', 'tool', 'guide', 'free', 'premium'];
const AVAIL = ['available', 'limited', 'coming_soon', 'claimed', 'sold_out'];

const TONE = { available: 'green', limited: 'amber', coming_soon: 'amber', claimed: 'red', sold_out: 'red' };

const EMPTY = {
  title: '', edition: 'java', listing_type: 'resource', price: '', availability: 'available',
  description: '', url: '', contact: '', featured: false, sort_order: 0,
};

export default function MinecraftAdmin() {
  const [state, setState] = useState({ loading: true, listings: [], error: null });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const d = await ownerApi.minecraft();
      setState({ loading: false, listings: d.listings, error: null });
    } catch {
      setState({ loading: false, listings: [], error: 'Unable to load Minecraft listings.' });
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await ownerApi.updateMinecraft(editing.id, editing);
      else await ownerApi.createMinecraft(editing);
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
      await ownerApi.deleteMinecraft(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setNotice(e.message || 'Delete failed.');
      setDeleting(null);
    }
  }

  const patch = (k, val) => setEditing((e) => ({ ...e, [k]: val }));

  return (
    <div>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">
          Java & Bedrock listings for the Minecraft hub. Sensitive account credentials are never shown publicly — they live in the Rewards inventory.
        </p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          <Icon.plus size={14} /> Add listing
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load listings" desc={state.error} retry={load} />}

      {!state.loading && state.listings.length === 0 && (
        <EmptyState title="No Minecraft listings" desc="Add hosting, tools, guides and free or premium resources." action={
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>Add listing</button>
        } />
      )}

      {!state.loading && state.listings.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Edition</th>
                <th>Type</th>
                <th>Availability</th>
                <th>Price</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.listings.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600 }}>{l.title}</td>
                  <td className="text-sm muted capitalize">{l.edition}</td>
                  <td className="text-sm muted">{l.listing_type}</td>
                  <td><Badge tone={TONE[l.availability] || 'gray'}>{l.availability.replace('_', ' ')}</Badge></td>
                  <td className="text-sm muted">{l.price || '—'}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title="Edit" onClick={() => setEditing({ ...l })}>
                        <Icon.edit size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(l)}>
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
        <Modal title={editing.id ? 'Edit listing' : 'Add listing'} onClose={() => setEditing(null)}>
          <Field label="Title" hint="required">
            <input className="input" value={editing.title} onChange={(e) => patch('title', e.target.value)} />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Edition</label>
              <select className="select" value={editing.edition} onChange={(e) => patch('edition', e.target.value)}>
                {EDITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Type</label>
              <select className="select" value={editing.listing_type} onChange={(e) => patch('listing_type', e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Availability</label>
              <select className="select" value={editing.availability} onChange={(e) => patch('availability', e.target.value)}>
                {AVAIL.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Price</label>
              <input className="input" value={editing.price} onChange={(e) => patch('price', e.target.value)} placeholder="Free / $5 / contact for price" />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">URL</label>
              <input className="input" type="url" value={editing.url} onChange={(e) => patch('url', e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label className="field-label">Contact</label>
              <input className="input" value={editing.contact} onChange={(e) => patch('contact', e.target.value)} placeholder="Discord / email" />
            </div>
          </div>
          <Field label="Description">
            <textarea className="textarea" value={editing.description} onChange={(e) => patch('description', e.target.value)} />
          </Field>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label className="field-label">Sort order</label>
              <input className="input" type="number" value={editing.sort_order} onChange={(e) => patch('sort_order', intOr(e.target.value))} />
            </div>
            <label className="checkbox-row" style={{ paddingTop: 8 }}>
              <input type="checkbox" checked={editing.featured} onChange={(e) => patch('featured', e.target.checked)} />
              Featured
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !editing.title.trim()}>
              {saving ? 'Saving…' : 'Save listing'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete "${deleting.title}" from the Minecraft hub?`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
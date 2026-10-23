import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal, Confirm, Field } from './dash';

const TONE = { available: 'green', coming_soon: 'amber', sold_out: 'red', hidden: 'gray' };

const CATEGORIES = [
  { key: 'reward', label: 'Reward / Award' },
  { key: 'promo', label: 'Promo Code' },
  { key: 'giftcard', label: 'Gift Card' },
  { key: 'service', label: 'Service' },
  { key: 'other', label: 'Other' },
];

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const EMPTY = {
  category: 'reward', title: '', description: '', price: '',
  availability: 'available', link_url: '', coin_cost: 0, sort_order: 0,
};

export default function ShopAdmin() {
  const [state, setState] = useState({ loading: true, items: [], error: null });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const d = await ownerApi.shopItems();
      setState({ loading: false, items: d.items, error: null });
    } catch {
      setState({ loading: false, items: [], error: 'Unable to load shop items.' });
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setEditing({ ...EMPTY });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const body = { ...editing, sort_order: Number(editing.sort_order) || 0 };
      if (editing.id) await ownerApi.updateShopItem(editing.id, body);
      else await ownerApi.createShopItem(body);
      setEditing(null);
      setNotice('Saved — shop pe live ho gaya.');
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
      await ownerApi.deleteShopItem(deleting.id);
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
          Shop items add karein — rewards/awards, promo codes, gift cards, services aur baqi sab.
          Jo yahan add hoga wahi public shop (/shop) par dikhega; empty sections fake data nahi dikhate.
        </p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          <Icon.plus size={14} /> Add shop item
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load shop items" desc={state.error} retry={load} />}

      {!state.loading && state.items.length === 0 && (
        <EmptyState
          title="Shop is empty"
          desc="Add the first real item — reward, promo code, gift card, ya koi bhi service. Fake ya demo items shop par kabhi nahi jate."
          action={
            <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>Add shop item</button>
          }
        />
      )}

      {!state.loading && state.items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Availability</th>
                <th>Price</th>
                <th>Link</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((it) => (
                <tr key={it.id}>
                  <td style={{ fontWeight: 600 }}>{it.title}</td>
                  <td className="text-sm muted">{CAT_LABEL[it.category] || it.category}</td>
                  <td><Badge tone={TONE[it.availability] || 'gray'}>{it.availability.replace('_', ' ')}</Badge></td>
                  <td className="text-sm muted">{it.price || '—'}</td>
                  <td className="text-sm muted">{it.link_url || '—'}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title="Edit" onClick={() => setEditing({ ...it })}>
                        <Icon.edit size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(it)}>
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
        <Modal title={editing.id ? 'Edit shop item' : 'Add shop item'} onClose={() => setEditing(null)}>
          <Field label="Category" hint="shop ke kis section mein dikhega">
            <select className="select" value={editing.category} onChange={(e) => patch('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Title" hint="required">
            <input className="input" value={editing.title} onChange={(e) => patch('title', e.target.value)} placeholder="e.g. Free FireGST gift card 100" />
          </Field>
          <Field label="Description">
            <textarea className="textarea" value={editing.description} onChange={(e) => patch('description', e.target.value)} placeholder="Kya hai, kaise milega, terms" />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Availability</label>
              <select className="select" value={editing.availability} onChange={(e) => patch('availability', e.target.value)}>
                {Object.keys(TONE).map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Price</label>
              <input className="input" value={editing.price} onChange={(e) => patch('price', e.target.value)} placeholder="Free / Rs 500 / Ask price" />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Link URL (optional)</label>
              <input className="input" value={editing.link_url} onChange={(e) => patch('link_url', e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label className="field-label">Coin cost (0 = coins wala redeem nahi)</label>
              <input className="input" type="number" min="0" value={editing.coin_cost} onChange={(e) => patch('coin_cost', e.target.value)} placeholder="e.g. 150" />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Sort order</label>
              <input className="input" type="number" value={editing.sort_order} onChange={(e) => patch('sort_order', e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !String(editing.title).trim()}>
              {saving ? 'Saving…' : 'Save item'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete shop item "${deleting.title}"? Ye shop se turant hat jayega.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

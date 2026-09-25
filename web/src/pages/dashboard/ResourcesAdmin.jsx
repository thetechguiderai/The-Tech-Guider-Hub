import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal, Confirm, Field, ImageUpload, intOr } from './dash';

const EMPTY = {
  name: '', url: '', logo: '', description: '', category: '', featured: false,
  sort_order: 0, videoIds: [],
};

export default function ResourcesAdmin() {
  const [state, setState] = useState({ loading: true, resources: [], error: null });
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const [r, v] = await Promise.all([ownerApi.resources(), ownerApi.videos()]);
      setState({ loading: false, resources: r.resources, error: null });
      setVideos(v.videos);
    } catch {
      setState({ loading: false, resources: [], error: 'Unable to load resources.' });
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await ownerApi.updateResource(editing.id, editing);
      else await ownerApi.createResource(editing);
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
      await ownerApi.deleteResource(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setNotice(e.message || 'Delete failed.');
      setDeleting(null);
    }
  }

  async function move(id, dir) {
    const list = [...state.resources];
    const idx = list.findIndex((r) => r.id === id);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setState((s) => ({ ...s, resources: list }));
    try {
      await ownerApi.reorderResources(list.map((r) => r.id));
    } catch {
      await load();
    }
  }

  const patch = (k, val) => setEditing((e) => ({ ...e, [k]: val }));

  return (
    <div>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">Resources used in videos. Click order = the order shown on the site. Every click is counted.</p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          <Icon.plus size={14} /> Add resource
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load resources" desc={state.error} retry={load} />}

      {!state.loading && state.resources.length === 0 && (
        <EmptyState title="No resources yet" desc="Add hosting providers, websites and tools referenced in your videos." action={
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>Add resource</button>
        } />
      )}

      {!state.loading && state.resources.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Resource</th>
                <th>Category</th>
                <th>Clicks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.resources.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <div className="flex" style={{ flexDirection: 'column' }}>
                      <button className="icon-btn" disabled={i === 0} onClick={() => move(r.id, -1)} aria-label="Move up" style={{ height: 22 }}>
                        ↑
                      </button>
                      <button className="icon-btn" disabled={i === state.resources.length - 1} onClick={() => move(r.id, 1)} aria-label="Move down" style={{ height: 22 }}>
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="flex align-center gap-2 minwidth-0">
                      {r.logo ? (
                        <img src={r.logo} alt="" width="38" height="38" style={{ borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span className="resource-logo fallback" style={{ width: 38, height: 38, fontSize: 15 }} aria-hidden="true">{r.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <div className="minwidth-0">
                        <div className="nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300, fontWeight: 600 }}>{r.name}</div>
                        {r.url && <div className="text-xs muted3 nowrap" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.url}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex align-center gap-2 flex-wrap">
                      <span className="text-sm muted">{r.category}</span>
                      {r.featured && <Badge tone="blue">Featured</Badge>}
                    </div>
                  </td>
                  <td className="mono text-sm muted">{r.clicks}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
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

      {editing && (
        <Modal title={editing.id ? 'Edit resource' : 'Add resource'} onClose={() => setEditing(null)}>
          <Field label="Name" hint="required">
            <input className="input" value={editing.name} onChange={(e) => patch('name', e.target.value)} />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Website URL</label>
              <input className="input" type="url" value={editing.url} onChange={(e) => patch('url', e.target.value)} placeholder="https://…" />
            </div>
            <div className="field">
              <label className="field-label">Category</label>
              <input className="input" value={editing.category} onChange={(e) => patch('category', e.target.value)} placeholder="Hosting" />
            </div>
          </div>
          <ImageUpload value={editing.logo} onChange={(u) => patch('logo', u)} folder="logos" label="Logo" />
          <Field label="Description">
            <textarea className="textarea" value={editing.description} onChange={(e) => patch('description', e.target.value)} />
          </Field>
          <label className="checkbox-row mt-1" style={{ marginBottom: 16, marginTop: 4 }}>
            <input type="checkbox" checked={editing.featured} onChange={(e) => patch('featured', e.target.checked)} />
            Featured resource
          </label>
          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !editing.name.trim()}>
              {saving ? 'Saving…' : 'Save resource'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete "${deleting.name}"? It will be removed from every video that links to it.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
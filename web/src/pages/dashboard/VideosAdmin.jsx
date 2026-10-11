import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon, formatNum } from '../../components/ui';
import { Modal, Confirm, Field, ImageUpload, intOr } from './dash';

const STATUS_TONE = { coming_soon: 'amber', published: 'green', hidden: 'gray' };
const EMPTY = {
  title: '', thumbnail: '', youtube_url: '', description: '', category: '',
  status: 'coming_soon', release_date: '', sort_order: 0, featured: false, resourceIds: [],
};

export default function VideosAdmin() {
  const [state, setState] = useState({ loading: true, videos: [], error: null });
  const [allResources, setAllResources] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const [v, r] = await Promise.all([ownerApi.videos(), ownerApi.resources()]);
      setState({ loading: false, videos: v.videos, error: null });
      setAllResources(r.resources);
    } catch {
      setState({ loading: false, videos: [], error: 'Unable to load videos.' });
    }
  }

  useEffect(() => { load(); }, []);

  // Quick action support: /owner/dashboard/videos?new=1 opens the create modal
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setEditing({ ...EMPTY });
  }, []);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await ownerApi.updateVideo(editing.id, editing);
      else await ownerApi.createVideo(editing);
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
      await ownerApi.deleteVideo(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setNotice(e.message || 'Delete failed.');
      setDeleting(null);
    }
  }

  async function toggleStatus(v) {
    const next = v.status === 'published' ? 'hidden' : 'published';
    try {
      await ownerApi.updateVideo(v.id, { status: next });
      await load();
    } catch (e) {
      setNotice(e.message || 'Update failed.');
    }
  }

  const patch = (k, val) => setEditing((e) => ({ ...e, [k]: val }));

  return (
    <div>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">Create, edit, publish or hide videos. Coming-soon videos appear on the public site with their release date.</p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>
          <Icon.plus size={14} /> Add video
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load videos" desc={state.error} retry={load} />}

      {!state.loading && state.videos.length === 0 && (
        <EmptyState title="No videos yet" desc="Add your first video or a coming-soon announcement." action={
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY })}>Add video</button>
        } />
      )}

      {!state.loading && state.videos.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Status</th>
                <th>Category</th>
                <th>Release</th>
                <th>Clicks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.videos.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="flex align-center gap-2 minwidth-0">
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt="" width="56" height="32" style={{ borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span className="resource-logo fallback" style={{ width: 56, height: 32, borderRadius: 6, fontSize: 13 }} aria-hidden="true">{v.title.slice(0, 2).toUpperCase()}</span>
                      )}
                      <div className="minwidth-0">
                        <div className="nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340, fontWeight: 600 }}>{v.title}</div>
                        {v.featured && <span className="text-xs muted3">Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td><Badge tone={STATUS_TONE[v.status]}>{v.status.replace('_', ' ')}</Badge></td>
                  <td className="text-sm muted">{v.category}</td>
                  <td className="text-sm muted">{v.release_date || '—'}</td>
                  <td className="text-sm muted mono">{formatNum(v.clicks)}</td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title={v.status === 'hidden' ? 'Publish' : 'Hide'} onClick={() => toggleStatus(v)}>
                        <Icon.eye size={16} />
                      </button>
                      <button className="icon-btn" title="Edit" onClick={() => setEditing({ ...v, resourceIds: (v.resources || []).map((r) => r.id) })}>
                        <Icon.edit size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(v)}>
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
        <Modal title={editing.id ? 'Edit video' : 'Add video'} onClose={() => setEditing(null)}>
          <Field label="Title" hint="required">
            <input className="input" value={editing.title} onChange={(e) => patch('title', e.target.value)} />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Status</label>
              <select className="select" value={editing.status} onChange={(e) => patch('status', e.target.value)}>
                <option value="coming_soon">Coming Soon</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Category</label>
              <input className="input" value={editing.category} onChange={(e) => patch('category', e.target.value)} placeholder="Minecraft" />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">YouTube URL</label>
              <input className="input" type="url" value={editing.youtube_url} onChange={(e) => patch('youtube_url', e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </div>
            <div className="field">
              <label className="field-label">Release date <span className="muted3">(planned)</span></label>
              <input className="input" type="date" value={editing.release_date} onChange={(e) => patch('release_date', e.target.value)} />
            </div>
          </div>
          <ImageUpload value={editing.thumbnail} onChange={(u) => patch('thumbnail', u)} folder="thumbnails" />
          <Field label="Description">
            <textarea className="textarea" value={editing.description} onChange={(e) => patch('description', e.target.value)} />
          </Field>
          <Field label="Resource links">
            <select
              className="select"
              value=""
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val && !editing.resourceIds.includes(val)) patch('resourceIds', [...editing.resourceIds, val]);
              }}
            >
              <option value="">Add a resource to this video…</option>
              {allResources
                .filter((r) => !editing.resourceIds.includes(r.id))
                .map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="chip-select mt-1" style={{ marginTop: 8 }}>
              {editing.resourceIds.map((rid) => {
                const r = allResources.find((x) => x.id === rid);
                return r ? (
                  <button key={rid} className="chip on" onClick={() => patch('resourceIds', editing.resourceIds.filter((x) => x !== rid))}>
                    {r.name} ✕
                  </button>
                ) : null;
              })}
            </div>
          </Field>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Sort order">
              <input className="input" type="number" value={editing.sort_order} onChange={(e) => patch('sort_order', intOr(e.target.value))} />
            </Field>
            <Field label="Featured">
              <label className="checkbox-row" style={{ paddingTop: 8 }}>
                <input type="checkbox" checked={editing.featured} onChange={(e) => patch('featured', e.target.checked)} />
                Show as featured
              </label>
            </Field>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !editing.title.trim()}>
              {saving ? 'Saving…' : 'Save video'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete "${deleting.title}"? This removes it from the public site and its resource links.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
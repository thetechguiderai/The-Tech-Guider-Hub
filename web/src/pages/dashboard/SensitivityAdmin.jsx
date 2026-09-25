import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, EmptyState, Badge, Icon } from '../../components/ui';
import { Modal, Confirm, Field, intOr } from './dash';

const DEVICE_TYPES = ['android', 'ios', 'pc'];
const PLAY_STYLES = ['one_tap', 'rush', 'balanced', 'sniper', 'custom'];
const CLASSES = ['low', 'mid', 'high'];

const EMPTY_VALUES = {
  general: 100, redDot: 92, scope2: 84, scope4: 74, sniperScope: 64,
  freeLook: 70, fireButtonSize: 86, dpi: '', dpiRange: '',
};

const EMPTY = {
  name: '', device_type: 'android', brand: '', device_model: '', ram: '',
  dpi: '', resolution: '', refresh_rate: '', play_style: 'balanced',
  performance_class: 'mid', values: { ...EMPTY_VALUES },
};

export default function SensitivityAdmin() {
  const [state, setState] = useState({ loading: true, profiles: [], error: null });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function load() {
    try {
      const d = await ownerApi.sensitivityProfiles();
      setState({ loading: false, profiles: d.profiles, error: null });
    } catch {
      setState({ loading: false, profiles: [], error: 'Unable to load sensitivity profiles.' });
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      if (editing.id) await ownerApi.updateProfile(editing.id, editing);
      else await ownerApi.createProfile(editing);
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
      await ownerApi.deleteProfile(deleting.id);
      setDeleting(null);
      await load();
    } catch (e) {
      setNotice(e.message || 'Delete failed.');
      setDeleting(null);
    }
  }

  const patch = (k, val) => setEditing((e) => ({ ...e, [k]: val }));
  const patchVal = (k, val) => setEditing((e) => ({ ...e, values: { ...e.values, [k]: val } }));

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="flex align-center justify-between flex-wrap gap-2 mb-2">
        <p className="text-sm muted">
          Tuned presets. If a visitor's device, class and play style match a profile, these values take over from the calculator.
        </p>
        <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY, values: { ...EMPTY_VALUES } })}>
          <Icon.plus size={14} /> Add profile
        </button>
      </div>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      {state.loading && <Spinner />}
      {state.error && <ErrorState title="Unable to load profiles" desc={state.error} retry={load} />}

      {!state.loading && state.profiles.length === 0 && (
        <EmptyState title="No sensitivity profiles yet" desc="The calculator runs on its built-in engine until you add tuned presets." action={
          <button className="btn btn-accent btn-sm" onClick={() => setEditing({ ...EMPTY, values: { ...EMPTY_VALUES } })}>Add profile</button>
        } />
      )}

      {!state.loading && state.profiles.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Targets</th>
                <th>Style / Class</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.profiles.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td className="text-sm muted">
                    {[p.device_type, p.brand && p.brand, p.device_model && p.device_model, p.ram].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>
                    <span className="flex align-center gap-2">
                      <Badge tone="gray">{p.play_style}</Badge>
                      <Badge tone="blue">{p.performance_class}</Badge>
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button className="icon-btn" title="Edit" onClick={() => setEditing({ ...p, values: { ...EMPTY_VALUES, ...(p.values || {}) } })}>
                        <Icon.edit size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setDeleting(p)}>
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
        <Modal title={editing.id ? 'Edit profile' : 'Add profile'} onClose={() => setEditing(null)}>
          <Field label="Profile name" hint="required">
            <input className="input" value={editing.name} onChange={(e) => patch('name', e.target.value)} placeholder="e.g. Samsung mid players — Balanced" />
          </Field>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Device type</label>
              <select className="select" value={editing.device_type} onChange={(e) => patch('device_type', e.target.value)}>
                {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Play style</label>
              <select className="select" value={editing.play_style} onChange={(e) => patch('play_style', e.target.value)}>
                {PLAY_STYLES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Brand <span className="muted3">(optional)</span></label>
              <input className="input" value={editing.brand} onChange={(e) => patch('brand', e.target.value)} placeholder="Samsung" />
            </div>
            <div className="field">
              <label className="field-label">Device model <span className="muted3">(optional)</span></label>
              <input className="input" value={editing.device_model} onChange={(e) => patch('device_model', e.target.value)} placeholder="Galaxy A54" />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">RAM match <span className="muted3">(optional)</span></label>
              <input className="input" value={editing.ram} onChange={(e) => patch('ram', e.target.value)} placeholder="6 GB" />
            </div>
            <div className="field">
              <label className="field-label">DPI match <span className="muted3">(optional)</span></label>
              <input className="input" value={editing.dpi} onChange={(e) => patch('dpi', e.target.value)} placeholder="440" />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Resolution match <span className="muted3">(optional)</span></label>
              <input className="input" value={editing.resolution} onChange={(e) => patch('resolution', e.target.value)} placeholder="1080p" />
            </div>
            <div className="field">
              <label className="field-label">Refresh rate match <span className="muted3">(optional)</span></label>
              <input className="input" value={editing.refresh_rate} onChange={(e) => patch('refresh_rate', e.target.value)} placeholder="90 Hz" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Performance class</label>
            <div className="chip-select">
              {CLASSES.map((c) => (
                <button key={c} className={`chip${editing.performance_class === c ? ' on' : ''}`} onClick={() => patch('performance_class', c)}>{c}</button>
              ))}
            </div>
          </div>

          <div className="eyebrow mb-2" style={{ marginTop: 8 }}>Values</div>
          <div className="form-grid">
            {[
              ['general', 'General'], ['redDot', 'Red Dot'], ['scope2', '2x Scope'], ['scope4', '4x Scope'],
              ['sniperScope', 'Sniper Scope'], ['freeLook', 'Free Look'], ['fireButtonSize', 'Fire button'],
            ].map(([k, label]) => (
              <div className="field" key={k}>
                <label className="field-label">{label}</label>
                <input className="input" type="number" min="0" max="100" value={editing.values[k] ?? ''} onChange={(e) => patchVal(k, intOr(e.target.value, 0))} />
              </div>
            ))}
            <div className="field">
              <label className="field-label">DPI recommendation <span className="muted3">(leave empty to auto)</span></label>
              <input className="input" type="number" value={editing.values.dpi ?? ''} onChange={(e) => patchVal('dpi', e.target.value ? intOr(e.target.value, 0) : '')} />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-accent btn-sm" onClick={save} disabled={saving || !editing.name.trim()}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </Modal>
      )}

      {deleting && (
        <Confirm
          message={`Delete sensitivity profile "${deleting.name}"? Visitors will fall back to the calculator for this setup.`}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
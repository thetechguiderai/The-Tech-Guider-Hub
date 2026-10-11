import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, Icon } from '../../components/ui';
import { Field, UrlField } from './dash';

export default function SettingsAdmin({ mode }) {
  const [state, setState] = useState({ loading: true, settings: null, error: null });
  const [form, setForm] = useState({
    social: { youtube: '', discord: '', instagram: '', tiktok: '', x: '', website: '' },
    aiUrl: '', logoUrl: '', tagline: '', youtubeChannelId: '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [newCode, setNewCode] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await ownerApi.settings();
        setState({ loading: false, settings: s, error: null });
        setForm({
          social: s.social || {},
          aiUrl: s.aiUrl || '',
          logoUrl: s.logoUrl || '',
          tagline: s.tagline || '',
          youtubeChannelId: s.youtubeChannelId || '',
        });
      } catch {
        setState({ loading: false, settings: null, error: 'Unable to load settings.' });
      }
    })();
  }, []);

  const patchSocial = (k, val) => setForm((f) => ({ ...f, social: { ...f.social, [k]: val } }));

  async function save() {
    setSaving(true);
    try {
      await ownerApi.updateSettings({
        social: form.social,
        aiUrl: form.aiUrl,
        logoUrl: form.logoUrl,
        tagline: form.tagline,
        youtubeChannelId: form.youtubeChannelId,
      });
      setNotice('Settings saved.');
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setNotice(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    if (!window.confirm('Generate a new owner access code? The old one is invalidated immediately.')) return;
    setRegenerating(true);
    try {
      const d = await ownerApi.regenerateCode();
      setNewCode(d.code);
      setNotice(null);
    } catch (e) {
      setNotice(e.message || 'Could not regenerate the code.');
    } finally {
      setRegenerating(false);
    }
  }

  if (state.loading) return <Spinner label="Loading settings…" />;
  if (state.error) return <ErrorState title="Settings unavailable" desc={state.error} />;

  async function downloadBackup() {
    setBackingUp(true);
    setNotice(null);
    try {
      const data = await ownerApi.backup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tech-guider-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const parts = Object.entries(data.tables || {})
        .filter(([, rows]) => rows.length > 0)
        .map(([k, rows]) => `${k}: ${rows.length}`);
      setBackupInfo(parts.length ? parts.join(' · ') : 'All tables are empty.');
    } catch (e) {
      setNotice(e.message || 'Backup failed.');
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div style={{ maxWidth: 780 }}>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      <div className="card mb-2" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Branding</h3>
        <Field label="Site tagline">
          <input className="input" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
        </Field>
        <UrlField label="Logo URL" value={form.logoUrl} onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))} hint="shown in the header and footer" />
      </div>

      <div className="card mb-2" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Social links</h3>
        <div className="form-grid">
          <UrlField label="YouTube" value={form.social.youtube} onChange={(v) => patchSocial('youtube', v)} placeholder="https://youtube.com/@…" />
          <UrlField label="Discord" value={form.social.discord} onChange={(v) => patchSocial('discord', v)} />
          <UrlField label="Instagram" value={form.social.instagram} onChange={(v) => patchSocial('instagram', v)} />
          <UrlField label="TikTok" value={form.social.tiktok} onChange={(v) => patchSocial('tiktok', v)} />
          <UrlField label="X (Twitter)" value={form.social.x} onChange={(v) => patchSocial('x', v)} />
          <UrlField label="Website" value={form.social.website} onChange={(v) => patchSocial('website', v)} />
        </div>
      </div>

      <div className="card mb-2" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>The Tech Guider AI</h3>
        <UrlField
          label="AI assistant URL"
          value={form.aiUrl}
          onChange={(v) => setForm((f) => ({ ...f, aiUrl: v }))}
          hint="the button on the AI page and header opens this link"
        />
        <p className="text-xs muted3">
          {form.aiUrl
            ? 'The AI button is live and points to your configured assistant.'
            : 'No URL set — the AI page shows a clean “not available yet” state (no placeholder).'}
        </p>
      </div>

      <div className="card mb-2" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>YouTube channel</h3>
        <Field label="Channel ID" hint="used together with the server-side API key">
          <input className="input" value={form.youtubeChannelId} onChange={(e) => setForm((f) => ({ ...f, youtubeChannelId: e.target.value }))} placeholder="UC…" />
        </Field>
        <p className="text-xs muted3">
          API key: {state.settings.apiConfigured ? 'configured on the server' : 'not configured (add YOUTUBE_API_KEY to .env)'}.
          The key itself is never visible in the browser.
        </p>
      </div>

      <div className="form-actions" style={{ justifyContent: 'flex-start', marginBottom: 28 }}>
        <button className="btn btn-accent" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'var(--bg-2)' }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>
          <span style={{ verticalAlign: 'middle', marginRight: 8 }}><Icon.download size={16} /></span>
          Data backup
        </h3>
        <p className="text-sm muted" style={{ marginBottom: 12 }}>
          Export the whole site database as a JSON file — videos, resources, listings, rewards, announcements,
          audit logs and analytics. Nothing is sent anywhere; the file is generated on this server and
          downloaded to your device.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={downloadBackup} disabled={backingUp}>
          <Icon.download size={14} /> {backingUp ? 'Preparing…' : 'Download full backup'}
        </button>
        {backupInfo && (
          <div className="alert alert-success mt-1" style={{ marginTop: 12 }} role="status">
            <div className="text-xs" style={{ lineHeight: 1.6 }}>{backupInfo}</div>
          </div>
        )}
      </div>

      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'var(--bg-2)' }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>
          <span style={{ verticalAlign: 'middle', marginRight: 8 }}><Icon.shield size={16} /></span>
          Owner access security
        </h3>
        <p className="text-sm muted" style={{ marginBottom: 12 }}>
          Only a secure hash of your access code is stored. Regenerating creates a fresh 10-digit code and
          invalidates the previous one immediately. The code is shown to you once.
        </p>
        <button className="btn btn-danger btn-sm" onClick={regenerate} disabled={regenerating}>
          <Icon.refresh size={14} /> {regenerating ? 'Generating…' : 'Regenerate Owner Access Code'}
        </button>
        {newCode && (
          <div className="alert alert-warning mt-1" style={{ marginTop: 14 }} role="status">
            <div>
              <strong>Your new 10-digit access code:</strong>
              <div className="mono" style={{ fontSize: 22, letterSpacing: '0.25em', margin: '8px 0', color: 'var(--text)' }}>
                {newCode}
              </div>
              <span className="text-xs">Save it somewhere safe — this is the only time it is shown.</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 10 }}
                onClick={() => navigator.clipboard?.writeText(newCode)}
              >
                <Icon.copy size={13} /> Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
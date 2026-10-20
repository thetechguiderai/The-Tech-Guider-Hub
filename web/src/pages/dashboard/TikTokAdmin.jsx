import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ownerApi } from '../../api';
import { Icon, ErrorState, Spinner } from '../../components/ui';
import { Field } from './dash';

/**
 * TikTok Studio — the owner's TikTok integration admin tab.
 *
 * Contains:
 *  1. Feed configuration (profile URL + curated canonical video URLs)
 *  2. Connect TikTok (official Login Kit OAuth, state + PKCE on the server)
 *  3. Publishing (official Content Posting API direct post) — enabled only
 *     when the developer app actually has the required approved scope;
 *     otherwise it shows the real blocking reason instead of pretending.
 */

const REDIRECT_URI_HINT = 'https://theguiderhub.vercel.app/api/tiktok/auth/callback';

export default function TikTokAdmin() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    profileUrl: '', refreshInterval: 900, curatedText: '',
    displayName: '', avatarUrl: '',
    stats: { followers: '', following: '', likes: '', views: '' },
  });
  const [curl, setCurl] = useState(''); // single video URL input
  const [preview, setPreview] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [preflight, setPreflight] = useState('loading');
  const [statusMsg, setStatusMsg] = useState(null);

  // Publish state
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('SELF_ONLY');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [progress, setProgress] = useState(null); // null | 0-100
  const [job, setJob] = useState(null); // { id, status, ... }
  const fileInputRef = useRef(null);

  function flash(msg) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const cfg = await ownerApi.tiktokConfig();
      setConfig(cfg);
      setForm((f) => ({
        ...f,
        profileUrl: cfg.profileUrl || '',
        refreshInterval: cfg.refreshInterval || 900,
        curatedText: (cfg.curated || []).map((v) => v.url).join('\n'),
        displayName: (cfg.displayName || ''),
        avatarUrl: (cfg.avatarUrl || ''),
        stats: {
          followers: cfg.stats && cfg.stats.followers || '',
          following: cfg.stats && cfg.stats.following || '',
          likes: cfg.stats && cfg.stats.likes || '',
          views: cfg.stats && cfg.stats.views || '',
        },
      }));
      setError(null);
      try {
        const pf = await ownerApi.tiktokPreflight();
        setPreflight(pf);
      } catch {
        setPreflight({ available: false, reason: 'unreachable' });
      }
    } catch (e) {
      setError(e.message || 'Unable to load TikTok settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Surface OAuth result bounced back by the server callback.
  useEffect(() => {
    if (searchParams.get('tiktok_connect')) {
      setStatusMsg({ ok: true, text: 'TikTok account connected. Real data arrives on the next refresh.' });
      searchParams.delete('tiktok_connect');
      window.history.replaceState({}, '', window.location.pathname);
      load();
    }
    const err = searchParams.get('tiktok_error');
    if (err) {
      setStatusMsg({ ok: false, text: `TikTok connection failed: ${err}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await ownerApi.updateTiktok({
        profileUrl: form.profileUrl,
        refreshInterval: Number(form.refreshInterval) || 900,
        curated: form.curatedText.split('\n').map((s) => s.trim()).filter(Boolean),
        displayName: form.displayName,
        avatarUrl: form.avatarUrl,
        stats: form.stats,
      });
      setForm((f) => ({ ...f, curatedText: (res.curated || []).map((v) => v.url).join('\n') }));
      flash('TikTok settings saved.');
    } catch (e) {
      flash(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function addCurated() {
    const url = curl.trim();
    if (!url) return;
    const lines = form.curatedText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.includes(url)) { flash('That video is already in the feed.'); return; }
    setCurl('');
    const updated = [...lines, url];
    try {
      const res = await ownerApi.updateTiktok({
        profileUrl: form.profileUrl,
        refreshInterval: Number(form.refreshInterval) || 900,
        curated: updated,
        displayName: form.displayName,
        avatarUrl: form.avatarUrl,
        stats: form.stats,
      });
      setForm((f) => ({ ...f, curatedText: (res.curated || []).map((v) => v.url).join('\n') }));
      flash('Video added to the feed.');
    } catch (e) {
      flash(e.message || 'Save failed.');
    }
  }

  async function refreshFeed() {
    setRefreshing(true);
    try {
      const p = await ownerApi.tiktokRefresh();
      setPreview(p);
      flash(p.available ? 'Feed refreshed from the official integration.' : `Feed refresh: ${p.reason || 'no data available'}`);
    } catch (e) {
      flash(e.message || 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  }

  async function connect(post) {
    setConnecting(true);
    try {
      const { url } = await ownerApi.tiktokAuthStart(post);
      window.location.assign(url);
    } catch (e) {
      flash(e.message || 'Could not start the TikTok connection.');
      setConnecting(false);
    }
  }

  async function disconnect() {
    try {
      await ownerApi.tiktokDisconnect();
      flash('TikTok account disconnected.');
      load();
    } catch (e) {
      flash(e.message || 'Disconnect failed.');
    }
  }

  function pickFile(f) {
    if (!f) return;
    if (!/video\/(mp4|quicktime|x-msvideo|webm)/.test(f.type)) {
      flash('The video must be an MP4, MOV or WebM file.');
      return;
    }
    if (f.size > 256 * 1024 * 1024) {
      flash('Video must be under 256 MB.');
      return;
    }
    if (f.size < 100 * 1024) {
      flash('That file looks too small to be a valid video.');
      return;
    }
    setFile(f);
  }

  async function publish() {
    if (!file) { flash('Choose a video file first.'); return; }
    if (!confirmChecked) { flash('You must tick the confirmation box before posting.'); return; }
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('video', file);
      fd.append('caption', caption);
      fd.append('privacy', privacy);
      fd.append('confirm', 'true');
      const res = await ownerApi.tiktokPublish(fd, setProgress);
      setJob(res);
      setNotice(res.message || 'Upload accepted.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setConfirmChecked(false);
      setProgress(null);
      // Immediately fetch the real (not invented) status.
      const st = await ownerApi.tiktokPublishStatus(res.id);
      setJob(st);
    } catch (e) {
      flash(e.message || 'Publishing failed.');
      setProgress(null);
    }
  }

  async function pollJob() {
    if (!job || !job.id) return;
    try {
      const st = await ownerApi.tiktokPublishStatus(job.id);
      setJob(st);
    } catch (e) {
      flash(e.message || 'Status check failed.');
    }
  }

  useEffect(() => {
    if (job && (job.status === 'processing')) {
      const t = setInterval(pollJob, 10000);
      return () => clearInterval(t);
    }
  }, [job]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner label="Loading TikTok settings…" />;
  if (error) return <ErrorState title="Couldn't load TikTok settings" desc={error} retry={load} />;

  const connected = config.connected;
  const caps = config.capabilities || {};
  const canPost = preflight && preflight.available === true;

  return (
    <div className="admin-page">
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {statusMsg && (
        <div className={`alert ${statusMsg.ok ? 'alert-success' : 'alert-error'}`} role="status">
          {statusMsg.text}
        </div>
      )}

      {/* ---- setup checklist ---- */}
      <div className="x-card" style={{ padding: 24 }}>
        <div className="sec-x-eyebrow">Setup checklist</div>
        <ol className="tt-checklist">
          <li>
            Create a TikTok developer app at{' '}
            <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer">
              developers.tiktok.com
            </a>{' '}
            and request the scopes <code>user.info.basic</code>, <code>video.list</code>, and — for posting —{' '}
            <code>video.publish</code> / <code>video.upload</code> (approved by TikTok's audit).
          </li>
          <li>
            Set the redirect URI in the app to <code>{REDIRECT_URI_HINT}</code>.
          </li>
          <li>
            On Vercel, add the environment variables:
            <ul>
              <li><code>TIKTOK_CLIENT_KEY</code></li>
              <li><code>TIKTOK_CLIENT_SECRET</code></li>
              <li><code>TIKTOK_REDIRECT_URI={REDIRECT_URI_HINT}</code></li>
            </ul>
          </li>
        </ol>
        <p className="text-xs muted3">
          Until the credentials and approvals exist, the public pages stay honest:
          official embeds and curated videos work, and everything else shows a clear
          "not configured" state — no fake stats, no fake live badge, no fake posting.
        </p>
      </div>

      {/* ---- feed config ---- */}
      <div className="x-card" style={{ padding: 24 }}>
        <div className="flex gap-2 align-center" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="sec-x-eyebrow">Public feed</div>
            <h3 style={{ fontSize: 18, marginTop: 4 }}>TikTok profile &amp; curated videos</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refreshFeed} disabled={refreshing}>
            <Icon.refresh size={14} /> {refreshing ? 'Refreshing…' : 'Refresh feed'}
          </button>
        </div>

        <div style={{ height: 12 }} />
        <div className="sec-x-eyebrow" style={{ marginBottom: 8 }}>Profile card (shown publicly, labelled "owner-reported")</div>
        <Field label="Display name" hint="exactly as it appears on TikTok">
          <input
            className="input"
            value={form.displayName}
            placeholder="乂ɴɪɢʜᴛᴍᴀʀᴇ乂"
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </Field>

        <Field label="Profile picture" hint="PNG/JPG/WebP · max 4 MB">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="" width="44" height="44" style={{ borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <span className="tt-avatar" aria-hidden="true" style={{ width: 44, height: 44 }}>{' '}</span>
            )}
            <input
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              value={form.avatarUrl}
              placeholder="Paste an uploaded image URL, or choose a file"
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={async (e) => {
                const f = e.target.files && e.target.files[0];
                if (!f) return;
                if (!/^image\//.test(f.type)) { flash('Please choose an image file.'); return; }
                if (f.size > 4 * 1024 * 1024) { flash('Image must be under 4 MB.'); return; }
                try {
                  const dataUrl = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result);
                    r.onerror = () => reject(new Error('Could not read the file.'));
                    r.readAsDataURL(f);
                  });
                  const res = await ownerApi.upload(dataUrl, 'logos');
                  setForm((s) => ({ ...s, avatarUrl: res.url }));
                  flash('Profile picture uploaded — press Save to publish it.');
                } catch (err) {
                  flash(err.message || 'Upload failed.');
                }
                e.target.value = '';
              }}
            />
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <Field label="Followers"><input className="input" value={form.stats.followers} onChange={(e) => setForm({ ...form, stats: { ...form.stats, followers: e.target.value } })} /></Field>
          <Field label="Following"><input className="input" value={form.stats.following} onChange={(e) => setForm({ ...form, stats: { ...form.stats, following: e.target.value } })} /></Field>
          <Field label="Likes"><input className="input" value={form.stats.likes} onChange={(e) => setForm({ ...form, stats: { ...form.stats, likes: e.target.value } })} /></Field>
          <Field label="Views"><input className="input" value={form.stats.views} onChange={(e) => setForm({ ...form, stats: { ...form.stats, views: e.target.value } })} /></Field>
        </div>
        <p className="text-xs muted3" style={{ margin: '4px 0 14px' }}>
          These are shown exactly as entered and labelled "owner-reported". Once the
          official TikTok Display API is connected, live API figures replace them
          automatically.
        </p>

        <Field label="Profile URL" hint="canonical form https://www.tiktok.com/@legend0.26">
          <input
            className="input"
            value={form.profileUrl}
            placeholder="https://www.tiktok.com/@legend0.26"
            onChange={(e) => setForm({ ...form, profileUrl: e.target.value })}
          />
        </Field>

        <Field label="Add a video to the public feed" hint="paste a TikTok video URL">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={curl}
              placeholder="https://www.tiktok.com/@legend0.26/video/1234567890123456789"
              onChange={(e) => setCurl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCurated(); } }}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addCurated} disabled={!curl.trim()}>
              <Icon.plus size={14} /> Add
            </button>
          </div>
        </Field>

        <Field label="Curated video URLs" hint="first 8 appear on the homepage">
          <textarea
            className="input"
            rows={4}
            value={form.curatedText}
            onChange={(e) => setForm({ ...form, curatedText: e.target.value })}
            style={{ minHeight: 90, resize: 'vertical' }}
          />
        </Field>

        <Field label="Refresh interval (seconds)" hint="api data cache window">
          <input
            className="input"
            type="number"
            min={300}
            value={form.refreshInterval}
            onChange={(e) => setForm({ ...form, refreshInterval: e.target.value })}
          />
        </Field>

        <div className="form-actions">
          <button className="btn btn-blue" onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving…' : 'Save TikTok settings'}
          </button>
        </div>

        {refreshing && <div className="text-xs muted3">Fetching from the official integration…</div>}
        {preview && (
          <div className="text-xs muted3" style={{ marginTop: 8 }}>
            {preview.available
              ? `Last official fetch: ${preview.videos.length} real video${preview.videos.length === 1 ? '' : 's'} (${preview.cachedAt}).`
              : `Official fetch outcome: ${preview.reason || 'unavailable'}. Cached data is shown when it exists.`}
          </div>
        )}
      </div>

      {/* ---- connection ---- */}
      <div className="x-card" style={{ padding: 24 }}>
        <div className="sec-x-eyebrow">Official account</div>
        <h3 style={{ fontSize: 18, marginTop: 4 }}>Connect TikTok</h3>
        <p className="text-xs muted3" style={{ marginTop: 6 }}>
          Uses the official TikTok Login Kit (OAuth 2 + PKCE). Tokens are stored
          encrypted on the server — never in the browser.
        </p>

        {connected ? (
          <div className="tt-connect-row">
            <div className="minwidth-0">
              <strong>{connected.displayName || 'Connected account'}</strong>
              <div className="text-xs muted3">
                scopes: {connected.scopes.length ? connected.scopes.join(', ') : '—'}{' '}
                {connected.tokenExpired && <span className="badge badge-amber">token expired — reconnect</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => connect(true)} disabled={connecting || !config.appConfigured}>
                Reconnect with posting
              </button>
              <button className="btn btn-danger btn-sm" onClick={disconnect}>Disconnect</button>
            </div>
          </div>
        ) : (
          <div className="tt-connect-row">
            <span className="text-sm muted3">No TikTok account connected.</span>
            <div className="flex gap-2">
              <button className="btn btn-blue btn-sm" onClick={() => connect(false)} disabled={connecting || !config.appConfigured}>
                <Icon.tiktok size={15} /> {connecting ? 'Opening TikTok…' : 'Connect TikTok'}
              </button>
            </div>
          </div>
        )}

        {!config.appConfigured && (
          <p className="text-xs muted3" style={{ marginTop: 10 }}>
            Connection is unavailable because the TikTok developer app credentials are not set on the server.
            Follow the checklist above — nothing fake happens in the meantime.
          </p>
        )}
      </div>

      {/* ---- publish ---- */}
      <div className="x-card" style={{ padding: 24 }}>
        <div className="sec-x-eyebrow">Publishing</div>
        <h3 style={{ fontSize: 18, marginTop: 4 }}>Post a video to TikTok</h3>

        {canPost ? (
          <>
            <p className="text-xs muted3" style={{ marginTop: 6 }}>
              Official direct post flow. The video is uploaded to TikTok and the REAL
              publishing status is polled — processing can take several minutes, and
              TikTok may keep the video pending review.
            </p>
            <div style={{ height: 10 }} />
            <Field label="Video file" hint="MP4 / MOV / WebM · max 256 MB">
              <input
                ref={fileInputRef}
                className="input"
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(e) => pickFile(e.target.files && e.target.files[0])}
              />
            </Field>
            <Field label="Caption" hint="hashtags included in the text">
              <textarea
                className="input"
                rows={3}
                maxLength={2200}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                style={{ minHeight: 70, resize: 'vertical' }}
              />
            </Field>
            <Field label="Privacy">
              <select className="input" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
                {(preflight.privacyOptions || ['SELF_ONLY']).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>

            {progress != null && (
              <div className="tt-progress" role="status">
                <div className="tt-progress-bar"><span style={{ width: `${progress}%` }} /></div>
                <span className="text-xs muted3">{progress}% uploaded</span>
              </div>
            )}

            <label className="flex gap-2 align-center" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
              />
              <span className="text-sm">
                I confirm I want to publish this video to the connected TikTok account.
              </span>
            </label>

            <div className="form-actions">
              <button
                className="btn btn-blue"
                onClick={publish}
                disabled={!file || !confirmChecked || progress != null}
              >
                <Icon.tiktok size={15} /> Submit to TikTok
              </button>
            </div>

            {job && (
              <div className="tt-job" role="status" style={{ marginTop: 16 }}>
                <div className="flex gap-2 align-center" style={{ justifyContent: 'space-between' }}>
                  <strong>Job #{job.id} — {job.status}</strong>
                  <button className="btn btn-ghost btn-sm" onClick={pollJob}>
                    <Icon.refresh size={13} /> Check real status
                  </button>
                </div>
                {job.detail && <div className="text-xs muted3" style={{ marginTop: 4 }}>{job.detail}</div>}
              </div>
            )}
          </>
        ) : (
          <div className="state" style={{ marginTop: 12 }}>
            <div className="state-icon"><Icon.alert size={22} /></div>
            <div className="state-title">Publishing not available yet</div>
            <p className="state-desc">
              {(preflight && preflight.error) ||
                (preflight === 'loading'
                  ? 'Checking the official capability…'
                  : 'The TikTok developer app does not have the approved posting scope yet.')}
            </p>
            <p className="text-xs muted3">
              Root cause: TikTok approves <code>video.publish</code> only after an audit of the
              developer app. Until then nothing is posted — by design. use the
              official TikTok app to post in the meantime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { ownerApi } from '../../api';
import { Spinner, ErrorState, Badge, Icon } from '../../components/ui';
import { Field, intOr } from './dash';

export default function YouTubeAdmin() {
  const [state, setState] = useState({ loading: true, config: null, error: null });
  const [form, setForm] = useState({ channelId: '', refreshInterval: 900, featuredVideo: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const config = await ownerApi.youtubeConfig();
        setState({ loading: false, config, error: null });
        setForm({
          channelId: config.channelId || '',
          refreshInterval: config.refreshInterval || 900,
          featuredVideo: config.featuredVideo || '',
        });
        const s = await ownerApi.youtubeRefresh().catch(() => null);
        setStats(s);
      } catch {
        setState({ loading: false, config: null, error: 'Unable to load YouTube settings.' });
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await ownerApi.updateYoutube({
        channelId: form.channelId,
        refreshInterval: intOr(form.refreshInterval, 900),
        featuredVideo: form.featuredVideo,
      });
      setNotice('YouTube settings saved.');
      setTimeout(() => setNotice(null), 2500);
      setState((s) => ({ ...s, config: form }));
    } catch (e) {
      setNotice(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      const s = await ownerApi.youtubeRefresh();
      setStats(s);
    } finally {
      setRefreshing(false);
    }
  }

  if (state.loading) return <Spinner label="Loading YouTube settings…" />;
  if (state.error) return <ErrorState title="YouTube settings unavailable" desc={state.error} />;

  const configured = state.config.apiConfigured;

  return (
    <div style={{ maxWidth: 760 }}>
      {notice && <div className="alert alert-success mb-2" role="status">{notice}</div>}

      <div className="card mb-2" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>API status</h3>
        {configured ? (
          <div className="flex align-center gap-2">
            <Badge tone="green">API key configured</Badge>
            <span className="text-xs muted">The key is stored in the server environment only — never sent to the browser.</span>
          </div>
        ) : (
          <div>
            <Badge tone="amber">API key not configured</Badge>
            <p className="text-sm muted" style={{ marginTop: 8 }}>
              Add <span className="mono">YOUTUBE_API_KEY</span> to the server <span className="mono">.env</span> file.
              Until then the public site shows a clean “Stats unavailable” state — no fake numbers.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <Field label="YouTube channel ID" hint="e.g. UC… (not the @handle)">
          <input className="input" value={form.channelId} onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))} placeholder="UC…" />
        </Field>
        <div className="form-grid">
          <Field label="Refresh interval (seconds)">
            <input className="input" type="number" min="60" value={form.refreshInterval} onChange={(e) => setForm((f) => ({ ...f, refreshInterval: e.target.value }))} />
          </Field>
          <Field label="Featured video URL">
            <input className="input" type="url" value={form.featuredVideo} onChange={(e) => setForm((f) => ({ ...f, featuredVideo: e.target.value }))} placeholder="https://youtube.com/watch?v=…" />
          </Field>
        </div>
        <div className="form-actions" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
          <button className="btn btn-accent" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          <button className="btn btn-ghost" onClick={refresh} disabled={refreshing}>
            <Icon.refresh size={14} /> {refreshing ? 'Refreshing…' : 'Test fetch now'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="card mt-2" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Last fetch result</h3>
          {stats.available ? (
            <div className="flex align-center gap-2 flex-wrap">
              <Badge tone="green">Live data</Badge>
              {stats.channel?.title && <span className="text-sm">{stats.channel.title}</span>}
              <span className="text-xs muted3">
                {stats.statistics?.subscriberCount} subs · {stats.statistics?.viewCount} views · {stats.statistics?.videoCount} videos
              </span>
            </div>
          ) : (
            <div>
              <Badge tone={stats.reason === 'not_configured' || stats.reason === 'no_channel' ? 'gray' : 'red'}>
                {stats.reason === 'not_configured' ? 'Not configured' : stats.reason === 'no_channel' ? 'No channel' : 'API error'}
              </Badge>
              <p className="text-sm muted" style={{ marginTop: 8 }}>{stats.message}</p>
              {stats.cached && (
                <p className="text-xs muted3" style={{ marginTop: 6 }}>
                  Cached copy available from {stats.cached.cachedAt}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
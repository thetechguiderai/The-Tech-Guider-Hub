import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { aiApi } from '../../aiClient';
import { Spinner, ErrorState, Badge, Icon } from '../../components/ui';

export default function UserSettings() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({ name: '', username: '', avatar: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [me, setts] = await Promise.all([aiApi.me(), aiApi.getSettings()]);
        setUser(me.user);
        setSettings(setts);
      } catch (err) {
        setError(err.message || 'Unable to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await aiApi.updateSettings(settings);
      setNotice('Settings saved successfully!');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Loading settings…" />;
  if (error && !user) return <ErrorState title="Auth Error" desc={error} />;

  return (
    <div className="container" style={{ paddingTop: 56, paddingBottom: 60, maxWidth: 900 }}>
      <div className="section-head">
        <div>
          <h1 className="section-title">User Settings</h1>
          <p className="section-sub">Manage your profile and account details.</p>
        </div>
        <Link to="/ai" className="btn btn-ghost btn-sm">Back to AI</Link>
      </div>

      <div className="grid-2" style={{ gap: 24, marginTop: 24 }}>
        {/* Left Column: Profile Summary & Balance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
              <img 
                src={settings.avatar || 'https://ui-avatars.com/api/?name=User&background=random'} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border)' }} 
              />
            </div>
            <h2 style={{ fontSize: 20, margin: 0 }}>{user?.name || 'User'}</h2>
            <p className="text-sm muted">@{settings.username || 'username'}</p>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, var(--blue), #1e40af)', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Icon.gift size={20} />
              <span style={{ fontWeight: 600, opacity: 0.9 }}>Guider Currency (TTG)</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {user?.points || 0} <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.8 }}>TTG</span>
            </div>
            <p className="text-xs" style={{ opacity: 0.7, marginTop: 8 }}>
              Earn more TTG by completing daily missions!
            </p>
          </div>
        </div>

        {/* Right Column: Update Form */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 20 }}>Profile Information</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label">Full Name</label>
              <input 
                className="input" 
                value={settings.name} 
                onChange={(e) => setSettings({ ...settings, name: e.target.value })} 
                placeholder="Enter your name"
              />
            </div>

            <div className="field">
              <label className="field-label">Username</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--muted3)', fontSize: 14 }}>@</span>
                <input 
                  className="input" 
                  style={{ flex: 1 }}
                  value={settings.username} 
                  onChange={(e) => setSettings({ ...settings, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} 
                  placeholder="username"
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Profile Picture (URL)</label>
              <input 
                className="input" 
                value={settings.avatar} 
                onChange={(e) => setSettings({ ...settings, avatar: e.target.value })} 
                placeholder="https://..."
              />
            </div>

            {notice && <div className="alert alert-success" style={{ marginTop: 12 }}>{notice}</div>}
            {error && <div className="alert alert-danger" style={{ marginTop: 12 }}>{error}</div>}

            <button 
              className="btn btn-primary" 
              onClick={save} 
              disabled={saving} 
              style={{ marginTop: 12 }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

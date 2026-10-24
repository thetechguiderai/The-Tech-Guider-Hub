import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiApi } from '../aiClient';
import { Spinner, ErrorState, Icon } from '../components/ui';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = mode === 'signup' ? { name, email, password } : { email, password };
      const data = mode === 'signup' ? await aiApi.signup(body) : await aiApi.login(body);
      // Success: go to workspace
      navigate('/ai');
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page" style={{ 
      minHeight: '100vh', display: 'grid', placeItems: 'center', 
      background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.08), transparent 70%), var(--bg)', 
      padding: 16 
    }}>
      <div style={{ width: 'min(400px, 100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Icon.ai size={48} />
          </div>
          <h1 style={{ fontSize: 24, letterSpacing: '-0.02em', marginTop: 12 }}>
            The Tech Guider Hub Helper AI
          </h1>
          <p className="text-sm muted" style={{ marginTop: 6 }}>
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to save your chats.'}
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="auth-tabs" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button 
              type="button" 
              className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => { setMode('login'); setError(null); }}
            >
              Sign in
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${mode === 'signup' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => { setMode('signup'); setError(null); }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div className="field">
                <label className="field-label">Full Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter your name" />
              </div>
            )}
            <div className="field">
              <label className="field-label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {error && <div className="alert alert-danger" style={{ margin: '8px 0' }}>{error}</div>}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? <Spinner size={16} /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

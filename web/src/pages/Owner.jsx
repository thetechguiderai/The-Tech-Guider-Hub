import React, { useEffect, useState, useRef } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ownerApi, publicApi } from '../api';
import { useMeta } from '../App';
import { Icon } from '../components/ui';

export default function Owner() {
  useMeta('Owner Access — The Tech Guider Hub', 'Restricted area for the owner of The Tech Guider Hub.');
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [bootstrap, setBootstrap] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [sess, boot] = await Promise.all([ownerApi.session(), publicApi.bootstrap()]);
        setAuthed(!!sess.authenticated);
        setBootstrap(boot);
      } catch {
        setAuthed(false);
        setBootstrap(null);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  if (!checked) return <Screen loading />;
  if (authed) return <Navigate to="/owner/dashboard" replace />;
  return <Screen bootstrap={bootstrap} />;
}

function Screen({ loading, bootstrap }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lockout, setLockout] = useState(null);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (lockout == null) return;
    timerRef.current = setInterval(() => {
      setLockout((s) => (s == null || s <= 0 ? null : s - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lockout == null]); // eslint-disable-line

  async function submit(e) {
    e.preventDefault();
    if (lockout) return;
    if (!email.trim() || !password) {
      setError('Enter your owner email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await ownerApi.login(email.trim(), password);
      if (res.authenticated) navigate('/owner/dashboard', { replace: true });
    } catch (err) {
      if (err.status === 423) {
        setLockout(err.data?.retryAfter || 60);
        setError('Too many failed attempts. Access is temporarily locked.');
      } else if (err.status === 401) {
        setError('Incorrect owner credentials. Please try again.');
      } else if (err.status === 500) {
        setError('Owner access is not configured yet on the server.');
      } else {
        setError('Unable to reach the verification server.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.08), transparent 70%), var(--bg)',
        padding: 16,
      }}
    >
      <div style={{ width: 'min(420px, 100%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <Link to="/" className="brand" style={{ justifyContent: 'center' }}>
            <span className="brand-mark"><Icon.shield size={16} /></span>
            The Tech Guider Hub
          </Link>
          <h1 style={{ fontSize: 22, letterSpacing: '-0.02em', marginTop: 18 }}>Owner Access</h1>
          <p className="text-sm muted" style={{ marginTop: 6 }}>
            Restricted area. Owner only — the hub has no public accounts.
          </p>
        </div>

        <div className="card" style={{ padding: 26 }}>
          <form onSubmit={submit}>
            <div className="field">
              <label className="field-label" htmlFor="owner-email">Owner email</label>
              <input
                id="owner-email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="owner@thetechguider.com"
                autoComplete="username"
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label" htmlFor="owner-password">Owner password</label>
              <input
                id="owner-password"
                className="input"
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-sm" style={{ color: 'var(--danger)', marginTop: 12 }} role="alert">
                {error}
                {lockout ? ` Retry in ${lockout}s.` : ''}
              </div>
            )}
            {lockout && (
              <div className="alert alert-warning" role="status">
                <Icon.alert size={16} />
                <span>Locked out after repeated failed attempts. Waiting {lockout}s…</span>
              </div>
            )}
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={busy || loading || !!lockout}
              style={{ marginTop: 6 }}
            >
              {busy ? 'Verifying…' : 'ACCESS DASHBOARD'}
            </button>
          </form>
          <p className="text-xs muted3" style={{ marginTop: 14, lineHeight: 1.6 }}>
            Signed in with the owner account email and password. Nothing is stored in your browser except a
            temporary, signed, HttpOnly session.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/" className="visit-link text-sm">
            <Icon.arrow size={13} style={{ transform: 'rotate(180deg)' }} /> Back to the hub
          </Link>
        </div>
      </div>
    </div>
  );
}

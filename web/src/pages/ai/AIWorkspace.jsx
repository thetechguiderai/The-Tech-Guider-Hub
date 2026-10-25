import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMeta } from '../../App';
import { Icon } from '../../components/ui';
import { aiApi, aiErrorMessage, isRetryable } from '../../aiClient';

/* ---------- brand icons (sparkle / paperclip / paper-plane) ---------- */
function Sparkle({ size = 18, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
      <path d="M12 2c.4 3.6 2 6 4.4 7.2C18.6 10.3 20.7 10.6 22 12c-1.3 1.4-3.4 1.7-5.6 2.8C14 16 12.4 18.4 12 22c-.4-3.6-2-6-4.4-7.2C5.4 13.7 3.3 13.4 2 12c1.3-1.4 3.4-1.7 5.6-2.8C10 8 11.6 5.6 12 2z" />
    </svg>
  );
}
function Paperclip({ size = 18, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21.44 11.05L12.25 20.24a6 6 0 0 1-8.49-8.49l8.57-8.57a4 4 0 1 1 5.66 5.66l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function Plane({ size = 16, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
function Sliders({ size = 17, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" /><path d="M1 14h6" /><path d="M9 8h6" /><path d="M17 16h6" />
    </svg>
  );
}

/* ---------- safe, minimal markdown rendering (no dangerouslySetInnerHTML) ---------- */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
function renderInline(str, keyBase) {
  const out = [];
  const re = new RegExp(INLINE);
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(str.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push(<strong key={`${keyBase}-b${i}`}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      out.push(<code className="aiw-inline" key={`${keyBase}-c${i}`}>{tok.slice(1, -1)}</code>);
    } else {
      const mm = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(tok);
      out.push(
        <a key={`${keyBase}-a${i}`} href={mm[2]} target="_blank" rel="noopener noreferrer">
          {mm[1]}
        </a>
      );
    }
    last = m.index + tok.length;
    i += 1;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}
function MessageBody({ text }) {
  const parts = String(text ?? '').split(/```/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const nl = part.indexOf('\n');
          const lang = nl >= 0 ? part.slice(0, nl).trim() : '';
          const code = nl >= 0 ? part.slice(nl + 1) : part;
          return (
            <pre className="aiw-code" key={i}>
              {lang ? <div className="aiw-code-lang">{lang}</div> : null}
              <code>{code.replace(/\n$/, '')}</code>
            </pre>
          );
        }
        return (
          <span className="aiw-text" key={i}>
            {renderInline(part, `p${i}`)}
          </span>
        );
      })}
    </>
  );
}

/* ---------- auth ---------- */
function AuthPanel({ onAuthed, onBack }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const body = mode === 'signup' ? { name, email, password } : { email, password, ...(token ? { token } : {}) };
      const data = mode === 'signup' ? await aiApi.signup(body) : await aiApi.login(body);
      onAuthed(data.user);
    } catch (err) {
      if (err?.data?.requires2FA) {
        setNeeds2fa(true);
        setError(err.message);
      } else {
        setError(err.message || 'Authentication failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="aiw-auth">
      <div className="aiw-auth-card">
        <div className="aiw-auth-logo">
          <Icon.ai size={26} />
        </div>
        <h1 className="aiw-auth-title">The Tech Guider AI</h1>
        <p className="aiw-auth-sub">
          {mode === 'login' ? 'Sign in to chat with Guider Astron and keep your history.' : 'Create an account to keep your chat history.'}
        </p>
        <div className="aiw-tabs" role="tablist">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 4px', color: 'var(--muted3)', fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} /> Email aur password se sign in karein <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <form onSubmit={submit} className="aiw-form">
          {mode === 'signup' && (
            <label>
              <span>Name <em>(optional)</em></span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : 1} />
          </label>
          {needs2fa && (
            <label>
              <span>Two-factor code</span>
              <input inputMode="numeric" value={token} onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" />
            </label>
          )}
          {error && <div className="aiw-alert" role="alert">{error}</div>}
          <button type="submit" className="btn btn-blue" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="aiw-auth-note">
          You can also{' '}
          {onBack ? (
            <button type="button" className="aiw-linkbtn" onClick={onBack}>chat as a guest</button>
          ) : (
            <Link to="/ai">chat as a guest</Link>
          )}{' '}
          with Guider Offline.
        </p>
      </div>
    </div>
  );
}

/* ---------- one message ---------- */
function Message({ msg, onCopy, onRetry }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`aiw-msg ${isUser ? 'user' : 'assistant'}`}>
      <div className="aiw-msg-avatar">{isUser ? 'You' : <Icon.ai size={16} />}</div>
      <div className="aiw-msg-body">
        {msg.error ? (
          <div className="aiw-msg-error" role="alert">
            <Icon.alert size={16} />
            <div>
              <div>{msg.content}</div>
              {msg.requestId && <div className="aiw-req">ref: {msg.requestId}</div>}
              {msg.canRetry && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                  <Icon.refresh size={14} /> Retry
                </button>
              )}
            </div>
          </div>
        ) : msg.pending ? (
          <span className="aiw-typing" aria-label="AI is thinking"><i /><i /><i /></span>
        ) : (
          <MessageBody text={msg.content} />
        )}
        {!isUser && !msg.error && !msg.pending && (
          <div className="aiw-msg-actions">
            <button type="button" onClick={onCopy} title="Copy reply">
              <Icon.copy size={14} /> Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- workspace ---------- */
export default function AIWorkspace() {
  useMeta('The Tech Guider AI — The Tech Guider Hub', 'The Tech Guider AI (Guider Astron): free AI assistant with BuildX mode — chat, code and build anything for the Hub.');
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(undefined); // undefined = loading, null = guest
  const [models, setModels] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [modelId, setModelId] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [usage, setUsage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [oauthNotice, setOauthNotice] = useState(null);
  // Chat modes: 'chat' (normal) | 'buildx' (code/project builder persona).
  const [mode, setMode] = useState('chat');
  // Simple text/code file attachment ( 图片 vision abhi available nahi).
  const [attached, setAttached] = useState(null); // { name, content }
  const [attachNote, setAttachNote] = useState('');
  const fileInputRef = useRef(null);

  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const lastPromptRef = useRef('');

  const usableModels = useMemo(() => {
    const loggedIn = Boolean(user);
    return models.filter((m) => {
      if (loggedIn) return true;
      return m.tier === 'guest'; // guests may only use guest-tier models
    });
  }, [models, user]);

  const activeModel = useMemo(() => models.find((m) => m.id === modelId) || null, [models, modelId]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await aiApi.conversations();
      setConversations(data.conversations || []);
    } catch {
      /* non-fatal */
    }
  }, [user]);

  const loadUsage = useCallback(async () => {
    if (!user) { setUsage(null); return; }
    try {
      const data = await aiApi.usage();
      setUsage(data);
    } catch {
      /* non-fatal */
    }
  }, [user]);

  // Initial load: session only.
  useEffect(() => {
    let alive = true;
    aiApi
      .me()
      .then((me) => { if (alive) setUser(me.user || null); })
      .catch(() => { if (alive) setUser(null); });
    // Google OAuth redirect lands on /ai?oauth=success|<reason>.
    const oauth = new URLSearchParams(window.location.search).get('oauth');
    if (oauth) {
      window.history.replaceState({}, '', '/ai');
      if (alive) setOauthNotice(
        oauth === 'success'
          ? { ok: true, text: 'Google sign-in kamyab — welcome to The Tech Guider Hub Helper AI!' }
          : {
              ok: false,
              text: oauth === 'unavailable'
                ? 'Google sign-in owner ne abhi configure nahi kiya — email/password use karein.'
                : oauth === 'account_disabled'
                  ? 'Ye account disabled hai. Support se rabta karein.'
                  : 'Google sign-in fail ho gaya — dobara try karein ya email/password use karein.',
            }
      );
      // Refresh session: cookie was just set by the OAuth callback.
      aiApi.me().then((me) => { if (alive) setUser(me.user || null); }).catch(() => {});
    }
    return () => { alive = false; };
  }, []);

  // Re-fetch the catalog and account data whenever the session changes, because
  // signing in/out changes which models are unlocked.
  useEffect(() => {
    if (user === undefined) return undefined;
    let alive = true;
    aiApi
      .models()
      .then((m) => { if (alive) setModels(m.models || []); })
      .catch(() => { /* surfaces as a clear error when sending */ });
    loadConversations();
    loadUsage();
    return () => { alive = false; };
  }, [user, loadConversations, loadUsage]);

  // Pick a default model when the catalog arrives.
  useEffect(() => {
    if (!usableModels.length) return;
    if (usableModels.some((m) => m.id === modelId && !m.locked)) return;
    const first = usableModels.find((m) => !m.locked && m.enabled !== false);
    if (first) setModelId(first.id);
  }, [usableModels, modelId]);

  // Load a conversation from the URL.
  useEffect(() => {
    if (user === undefined || !user) return;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let alive = true;
    setLoadingConv(true);
    aiApi
      .conversation(conversationId)
      .then((data) => {
        if (!alive) return;
        setMessages(
          (data.messages || []).map((m) => ({ role: m.role, content: m.content }))
        );
        if (data.conversation?.model && usableModels.some((m) => m.id === data.conversation.model)) {
          setModelId(data.conversation.model);
        }
      })
      .catch((err) => {
        if (!alive) return;
        setMessages([]);
        if (err.status === 404) navigate('/ai', { replace: true });
      })
      .finally(() => { if (alive) setLoadingConv(false); });
    return () => { alive = false; };
  }, [conversationId, user, usableModels, navigate]);

  // Autoscroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(
    async (text, { isRetry = false } = {}) => {
      const prompt = String(text ?? '').trim();
      if (!prompt || sending) return;
      // BuildX mode goes to the server as a separate persona; attached file
      // content is inlined as text so text models can genuinely use it.
      const fileSuffix = attached
        ? `\n\n--- attached file: ${attached.name} ---\n${attached.content}`
        : '';
      const fullPrompt = prompt + fileSuffix;
      lastPromptRef.current = fullPrompt;

      // Optimistically show the user turn (skip duplicating on retry).
      setMessages((prev) => {
        const base = isRetry && prev.length && prev[prev.length - 1].error ? prev.slice(0, -1) : prev;
        return [...base, { role: 'user', content: isRetry ? prompt : prompt + (attached ? `\n\n📎 ${attached.name}` : ''), file: isRetry ? undefined : attached?.name }, { role: 'assistant', content: 'Thinking…', pending: true }];
      });
      setInput('');
      setAttached(null);
      setSending(true);
      abortRef.current = new AbortController();

      try {
        const data = await aiApi.chat(
          {
            message: fullPrompt,
            modelId: modelId || undefined,
            conversationId: conversationId || undefined,
            mode: mode === 'buildx' ? 'buildx' : undefined,
          },
          abortRef.current.signal
        );
        setMessages((prev) => {
          const base = prev.slice(0, -1);
          return [...base, { role: 'assistant', content: data.reply || '' }];
        });
        if (data.conversationId && data.conversationId !== conversationId) {
          navigate(`/ai/chat/${data.conversationId}`);
          loadConversations();
        }
        loadUsage();
      } catch (err) {
        const msg = aiErrorMessage(err);
        setMessages((prev) => {
          const base = prev.slice(0, -1);
          return [...base, { role: 'assistant', content: msg, error: true, requestId: err.requestId, canRetry: isRetryable(err) }];
        });
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [conversationId, modelId, navigate, loadConversations, loadUsage, sending, mode, attached]
  );

  function stop() {
    if (abortRef.current) abortRef.current.abort();
  }

  // --- Attach files (text/code only — image vision abhi available nahi) ------
  const TEXT_EXTS = /\.(txt|md|js|mjs|cjs|jsx|ts|tsx|json|html|htm|css|py|java|c|cpp|h|cs|php|rb|go|rs|sql|sh|bat|yml|yaml|xml|csv|ini|cfg|log|env)$/i;
  function onPickFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (f.type.startsWith('image/')) {
      setAttachNote('Image files abhi support nahi (vision nahi hai) — text/code file attach karein.');
      setTimeout(() => setAttachNote(''), 3500);
      return;
    }
    if (f.size > 200 * 1024) {
      setAttachNote('File 200KB se bari hai — choti text/code file attach karein.');
      setTimeout(() => setAttachNote(''), 3500);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const isText = TEXT_EXTS.test(f.name) || (f.type || '').startsWith('text/');
      if (!isText) {
        setAttachNote('Sirf text/code files attach ho sakti hain.');
        setTimeout(() => setAttachNote(''), 3500);
        return;
      }
      const content = String(reader.result || '').slice(0, 150000);
      setAttached({ name: f.name, content });
    };
    reader.readAsText(f);
  }
  function toggleBuildX() {
    setMode((m) => (m === 'buildx' ? 'chat' : 'buildx'));
  }

  function newChat() {
    if (sending) stop();
    navigate('/ai');
    setSidebarOpen(false);
  }
  function openConv(id) {
    navigate(`/ai/chat/${id}`);
    setSidebarOpen(false);
  }
  async function removeConv(id, e) {
    e.stopPropagation();
    try {
      await aiApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === conversationId) navigate('/ai');
    } catch {
      /* ignore */
    }
  }
  async function signOut() {
    try { await aiApi.logout(); } catch { /* ignore */ }
    setUser(null);
    setConversations([]);
    setMessages([]);
    navigate('/ai');
  }
  function copyMsg(content) {
    if (navigator.clipboard) navigator.clipboard.writeText(content).catch(() => {});
  }
  function regenerate() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      const idx = messages.lastIndexOf(lastUser);
      setMessages((prev) => prev.slice(0, idx + 1));
      send(lastUser.content);
    }
  }

  function onSelectModel(e) {
    const next = usableModels.find((m) => m.id === e.target.value);
    if (next && next.locked) {
      navigate('/ai/plans');
      return;
    }
    setModelId(e.target.value);
  }

  if (user === undefined) {
    return (
      <div className="aiw-loading">
        <div className="spinner" />
        <span>Loading The Tech Guider AI…</span>
      </div>
    );
  }

  const showAuth = showAuthPanel || (user === null && models.length > 0 && usableModels.length === 0);

  return (
    <div className={`aiw${sidebarOpen ? ' side-open' : ''}`}>
      {oauthNotice && (
        <div
          role="status"
          style={{
            padding: '9px 16px',
            background: oauthNotice.ok ? 'rgba(47,158,68,0.14)' : 'rgba(229,72,77,0.12)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}
        >
          <Icon.check size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{oauthNotice.text}</span>
          <button type="button" className="aiw-linkbtn" onClick={() => setOauthNotice(null)}>✕</button>
        </div>
      )}
      <aside className="aiw-side">
        <div className="aiw-side-brand">
          <span className="aiw-brand-mark"><Sparkle size={14} /></span>
          <span>The Tech Guider AI</span>
        </div>
        <div className="aiw-side-head">
          <button type="button" className="btn aiw-new" onClick={newChat}>
            <Icon.plus size={16} /> New Chat
          </button>
          <button
            type="button"
            className={`aiw-buildx${mode === 'buildx' ? ' on' : ''}`}
            onClick={toggleBuildX}
            title="BuildX: code aur projects banane wala mode"
          >
            <Icon.tool size={15} /> BuildX
          </button>
        </div>
        <div className="aiw-convs">
          {!user && <p className="aiw-side-hint">Sign in to save your chats.</p>}
          {user && conversations.length === 0 && <p className="aiw-side-hint">Your chats will appear here</p>}
          {conversations.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`aiw-conv${c.id === conversationId ? ' on' : ''}`}
              onClick={() => openConv(c.id)}
            >
              <span className="aiw-conv-title">{c.title || 'Untitled'}</span>
              <span className="aiw-conv-del" role="button" tabIndex={0} onClick={(e) => removeConv(c.id, e)} title="Delete">
                <Icon.trash size={14} />
              </span>
            </button>
          ))}
        </div>
        <div className="aiw-side-foot">
          {user ? (
            <div className="aiw-side-user">
              <Link to="/ai/settings" className="aiw-user-chip" title="User Settings">
                {user.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  <span className="aiw-user-initial">{(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}</span>
                )}
                <span className="aiw-side-name">{user.name || user.email}</span>
                <span className="aiw-user-sliders"><Sliders size={17} /></span>
              </Link>
              <div className="aiw-side-user-actions">
                <Link to="/ai/plans" className="aiw-side-link" onClick={() => setSidebarOpen(false)}>
                  <Icon.star size={14} /> Plans
                </Link>
                <button type="button" className="aiw-side-link" onClick={signOut}>
                  <Icon.logout size={14} /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="aiw-side-link" onClick={() => setShowAuthPanel(true)}>
              <Icon.profile size={15} /> Sign in / Guest mode
            </button>
          )}
        </div>
      </aside>

      <main className="aiw-main">
        <header className="aiw-head">
          <button type="button" className="aiw-burger" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle chats">
            <Icon.list size={18} />
          </button>
          <div className="aiw-head-title">
            <span className="aiw-dot" />
            {activeModel ? activeModel.name : 'The Tech Guider AI'}
          </div>
          <div className="aiw-head-right">
            <div className="aiw-model-wrap">
              <span className="aiw-model-ico"><Icon.settings size={15} /></span>
              <select className="aiw-model" value={modelId} onChange={onSelectModel} aria-label="Select Models">
                {usableModels.length === 0 && <option value="">No models available</option>}
                {usableModels.map((m) => {
                  const note = m.enabled === false
                    ? ' · Unavailable'
                    : m.locked
                      ? (m.tier === 'guest' ? ' · Guest only' : ' · Upgrade required')
                      : '';
                  return (
                    <option key={m.id} value={m.id} disabled={m.locked || m.enabled === false}>
                      {m.name}{note}
                    </option>
                  );
                })}
              </select>
              <span className="aiw-model-chev">▾</span>
            </div>
          </div>
        </header>

        {showAuth ? (
          <AuthPanel
            onAuthed={(u) => { setUser(u); setShowAuthPanel(false); }}
            onBack={showAuthPanel && usableModels.length > 0 ? () => setShowAuthPanel(false) : null}
          />
        ) : (
          <>
            <div className="aiw-msgs" ref={scrollRef}>
              {loadingConv && <div className="aiw-loading-inline"><div className="spinner" /> Loading conversation…</div>}
              {!loadingConv && messages.length === 0 && (
                <div className="aiw-empty">
                  <div className="aiw-hero">
                    <div className="aiw-hero-ico"><Sparkle size={26} /></div>
                    <h1 className="aiw-hero-title">
                      {mode === 'buildx' ? 'Build Anything' : 'Ask Me Anything'}
                    </h1>
                    <p className="aiw-hero-sub">
                      {mode === 'buildx'
                        ? 'BuildX ON — websites, games, tools, sab ban jayega. Batao kya banana hai?'
                        : 'The Tech Guider AI (Guider Astron) — tech, coding, gaming ya YouTube, kuch bhi poochein.'}
                    </p>
                  </div>
                  <div className="aiw-suggests">
                    {(mode === 'buildx'
                      ? [
                          'Ek personal portfolio website bana do',
                          'Tic-tac-toe game HTML/JS mein banao',
                          'YouTube subscriber counter script do',
                          'Simple calculator app banao',
                        ]
                      : [
                          'Yahan kya milta hai? (site tour)',
                          'Free Fire sensitivity kaise set karun?',
                          'Minecraft server setup checklist do',
                          'YouTube video ke liye script plan karo',
                          'HTML/JS code likhne mein madad do',
                        ]
                    ).map((s) => (
                      <button key={s} type="button" className="aiw-suggest" onClick={() => send(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <Message
                  key={i}
                  msg={m}
                  onCopy={() => copyMsg(m.content)}
                  onRetry={() => send(lastPromptRef.current || m.content, { isRetry: true })}
                />
              ))}
            </div>

            <div className="aiw-composer-wrap">
              {activeModel && typeof activeModel.dailyLimit === 'number' && activeModel.dailyLimit > 0 && user && (
                <div className="aiw-limit">
                  {activeModel.name}: {activeModel.dailyLimit} messages/day
                  {usage ? ` · used today: ${(usage.models.find((u) => u.modelId === activeModel.id)?.used) || 0}` : ''}
                </div>
              )}
              {!user && (
                <div className="aiw-guest-banner">
                  <span>You’re in guest mode (Guider Offline).</span>
                  <span className="aiw-guest-actions">
                    <button type="button" className="aiw-linkbtn" onClick={() => setShowAuthPanel(true)}>Sign in</button>
                    <Link to="/ai/plans">See plans</Link>
                  </span>
                </div>
              )}
              <form
                className="aiw-composer"
                onSubmit={(e) => { e.preventDefault(); send(input); }}
              >
                {attached && (
                  <div className="aiw-attach-chip" title={attached.name.slice(0, 100)}>
                    <>📎 {attached.name}</>
                    <button type="button" onClick={() => setAttached(null)} aria-label="Remove attachment">✕</button>
                  </div>
                )}
                <div className="aiw-pill">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.js,.mjs,.cjs,.jsx,.ts,.tsx,.json,.html,.htm,.css,.py,.java,.c,.cpp,.h,.cs,.php,.rb,.go,.rs,.sql,.sh,.bat,.yml,.yaml,.xml,.csv,.ini,.cfg,.log,.env,text/*"
                    onChange={onPickFile}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="aiw-attach-btn"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Text/code file attach karein"
                    aria-label="Attach file"
                  >
                    <Paperclip size={17} />
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                    }}
                    placeholder={mode === 'buildx' ? 'BuildX: kya banana hai?' : 'Ask Me Anything'}
                    rows={1}
                    disabled={sending}
                  />
                  {sending ? (
                    <button type="button" className="aiw-send-pill ghost" onClick={stop} title="Stop">
                      Stop
                    </button>
                  ) : (
                    <button type="submit" className="aiw-send-pill" disabled={!input.trim()} title="Send">
                      Send <Plane size={15} />
                    </button>
                  )}
                </div>
                {attachNote && <div className="aiw-attach-note">⚠ {attachNote}</div>}
                {mode === 'buildx' && !attachNote && (
                  <div className="aiw-attach-note ok">🛠 BuildX ON — ab aap ka AI sirf building/code pe focus karega.</div>
                )}
              </form>
              <div className="aiw-foot">
                <span>Responses may be inaccurate — verify important information.</span>
                {messages.length > 1 && !sending && (
                  <button type="button" className="aiw-regen" onClick={regenerate}>
                    <Icon.refresh size={13} /> Regenerate
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

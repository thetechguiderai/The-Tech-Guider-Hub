import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMeta } from '../../App';
import { Icon } from '../../components/ui';
import { aiApi, aiErrorMessage, isRetryable } from '../../aiClient';

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
          {mode === 'login' ? 'Sign in to chat, keep history and use your unlocked models.' : 'Create an account to save history and unlock more models.'}
        </p>
        <div className="aiw-tabs" role="tablist">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button type="button" className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
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
  useMeta('The Tech Guider AI — The Tech Guider Hub', 'Chat with The Tech Guider AI: fast answers, coding, research and content help inside the Hub.');
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
      lastPromptRef.current = prompt;

      // Optimistically show the user turn (skip duplicating on retry).
      setMessages((prev) => {
        const base = isRetry && prev.length && prev[prev.length - 1].error ? prev.slice(0, -1) : prev;
        return [...base, { role: 'user', content: prompt }, { role: 'assistant', content: 'Thinking…', pending: true }];
      });
      setInput('');
      setSending(true);
      abortRef.current = new AbortController();

      try {
        const data = await aiApi.chat(
          { message: prompt, modelId: modelId || undefined, conversationId: conversationId || undefined },
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
    [conversationId, modelId, navigate, loadConversations, loadUsage, sending]
  );

  function stop() {
    if (abortRef.current) abortRef.current.abort();
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
      <aside className="aiw-side">
        <div className="aiw-side-head">
          <button type="button" className="btn btn-blue aiw-new" onClick={newChat}>
            <Icon.plus size={16} /> New chat
          </button>
        </div>
        <div className="aiw-convs">
          {!user && <p className="aiw-side-hint">Sign in to save your chats.</p>}
          {user && conversations.length === 0 && <p className="aiw-side-hint">No conversations yet.</p>}
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
          <Link to="/ai/plans" className="aiw-side-link" onClick={() => setSidebarOpen(false)}>
            <Icon.star size={15} /> Plans &amp; usage
          </Link>
          {user ? (
            <div className="aiw-side-user">
              <div className="aiw-side-name">{user.name || user.email}</div>
              <button type="button" className="aiw-side-link" onClick={signOut}>
                <Icon.logout size={15} /> Sign out
              </button>
            </div>
          ) : (
            <button type="button" className="aiw-side-link" onClick={() => setSidebarOpen(false)}>
              <Icon.profile size={15} /> Guest mode
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
            <select className="aiw-model" value={modelId} onChange={onSelectModel} aria-label="Model">
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
                  <div className="aiw-empty-icon"><Icon.ai size={26} /></div>
                  <h2>How can I help you today?</h2>
                  <p>
                    Ask about tech, coding, gaming, your hub content or anything else. {user ? 'Your chats are saved.' : 'Sign in to save your chats and unlock more models.'}
                  </p>
                  <div className="aiw-suggests">
                    {[
                      'Yahan kya milta hai? (site tour)',
                      'Free Fire sensitivity kaise set karun?',
                      'Minecraft server setup checklist do',
                      'YouTube video ke liye script plan karo',
                      'HTML/JS code likhne mein madad do',
                    ].map((s) => (
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
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
                  }}
                  placeholder={sending ? 'Waiting for a response…' : 'Message The Tech Guider AI…'}
                  rows={1}
                  disabled={sending}
                />
                {sending ? (
                  <button type="button" className="btn btn-ghost aiw-send" onClick={stop} title="Stop">
                    Stop
                  </button>
                ) : (
                  <button type="submit" className="btn btn-blue aiw-send" disabled={!input.trim()} title="Send">
                    <Icon.arrow size={18} />
                  </button>
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

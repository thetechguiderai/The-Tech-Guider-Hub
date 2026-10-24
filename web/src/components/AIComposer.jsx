import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './ui';
import { aiApi, aiErrorMessage, isRetryable } from '../aiClient';

// A prominent, native AI assistant for the home page. It talks to the real
// backend at the same origin (no redirect, no iframe) and renders the reply
// inline. On failure it shows the real reason and keeps the prompt for Retry.
export default function AIComposer() {
  const [modelId, setModelId] = useState('');
  const [input, setInput] = useState('');
  const [reply, setReply] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState(null);
  const [ready, setReady] = useState(false);
  const abortRef = useRef(null);
  const lastPromptRef = useRef('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await aiApi.me().catch(() => ({ user: null }));
        const m = await aiApi.models();
        if (!alive) return;
        const list = m.models || [];
        const loggedIn = Boolean(me.user);
        const pick =
          list.find((x) => !x.locked && x.enabled !== false && (loggedIn ? true : x.tier === 'guest')) ||
          list.find((x) => !x.locked && x.enabled !== false);
        if (pick) setModelId(pick.id);
      } catch {
        /* leave modelId empty; send will surface a clear error */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function ask(text, { isRetry = false } = {}) {
    const prompt = String(text ?? '').trim();
    if (!prompt || busy) return;
    lastPromptRef.current = prompt;
    if (!isRetry) setInput('');
    setBusy(true);
    setError(null);
    setReply(null);
    abortRef.current = new AbortController();
    try {
      const data = await aiApi.chat({ message: prompt, modelId: modelId || undefined }, abortRef.current.signal);
      setReply(data.reply || '');
      setConvId(data.conversationId || null);
    } catch (err) {
      setError({ message: aiErrorMessage(err), requestId: err.requestId, retry: isRetryable(err) });
      if (!isRetry) setInput(prompt);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const suggestions = [
    'Recommend a tool for editing videos',
    'Best Free Fire sensitivity settings?',
    'How do I set up a Minecraft server?',
  ];

  return (
    <section className="home-ai card">
      <div className="home-ai-head">
        <span className="home-ai-badge"><Icon.ai size={18} /> The Tech Guider Hub Helper AI</span>
        <span className="home-ai-live"><span className="aiw-dot" /> Ask anything, right here</span>
      </div>
      <h2 className="home-ai-title">Your AI assistant, built into the Hub</h2>
      <p className="home-ai-sub">
        Get instant answers about tech, coding, gaming and the hub's content — without leaving the page.
      </p>

      <form
        className="home-ai-form"
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ready ? 'Ask The Tech Guider Hub Helper AI…' : 'Loading assistant…'}
          disabled={busy || !ready}
          aria-label="Ask The Tech Guider Hub Helper AI"
        />
        {busy ? (
          <button type="button" className="btn btn-ghost" onClick={() => abortRef.current?.abort()}>Stop</button>
        ) : (
          <button type="submit" className="btn btn-blue" disabled={!input.trim() || !ready}>
            Ask <Icon.arrow size={16} />
          </button>
        )}
      </form>

      {!busy && !reply && !error && (
        <div className="home-ai-suggests">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      {busy && (
        <div className="home-ai-reply">
          <div className="home-ai-typing"><span /><span /><span /></div>
        </div>
      )}

      {reply !== null && !busy && (
        <div className="home-ai-reply">
          <div className="home-ai-reply-text">{reply}</div>
          <div className="home-ai-reply-foot">
            <span className="text-xs muted3">Responses may be inaccurate — verify important information.</span>
            {convId ? (
              <Link to={`/ai/chat/${convId}`} className="btn btn-ghost btn-sm">Continue in chat <Icon.arrow size={14} /></Link>
            ) : (
              <Link to="/ai" className="btn btn-ghost btn-sm">Continue in chat <Icon.arrow size={14} /></Link>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="home-ai-reply" role="alert">
          <div className="aiw-msg-error">
            <Icon.alert size={16} />
            <div>
              <div>{error.message}</div>
              {error.requestId && <div className="aiw-req">ref: {error.requestId}</div>}
              {error.retry && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => ask(lastPromptRef.current, { isRetry: true })}>
                  <Icon.refresh size={14} /> Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="home-ai-foot">
        <Link to="/ai">Open the full AI workspace</Link>
        <span className="muted3">·</span>
        <Link to="/ai/plans">Plans &amp; usage</Link>
      </div>
    </section>
  );
}

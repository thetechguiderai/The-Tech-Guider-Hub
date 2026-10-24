import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './ui';
import { aiApi, aiErrorMessage } from '../aiClient';

const SUGGESTIONS = [
  'Yahan kya kya milta hai? (What is on this site?)',
  'Free Fire sensitivity kaise set karun?',
  'AI ke plans aur models ka intro do',
  'Payment kaise hoti hai?',
];

/* Floating "Ask AI / Help" widget. Uses the hub-help chat mode, which gets a
   site-map system prompt server-side and stays out of saved conversations. */
export default function AIHelper() {
  const location = useLocation();
  const inWorkspace = location.pathname.startsWith('/ai');
  const [panelOpen, setPanelOpen] = useState(false);
  const [user, setUser] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!panelOpen || user !== undefined) return undefined;
    aiApi.me().then((me) => { if (alive) setUser(me.user || null); }).catch(() => { if (alive) setUser(null); });
    return () => { alive = false; };
  }, [panelOpen, user]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const send = useCallback(async (text) => {
    const prompt = String(text ?? '').trim();
    if (!prompt || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: '', pending: true }]);
    setSending(true);
    abortRef.current = new AbortController();
    const modelId = 'guider-astron';
    try {
      const body = {
        message: `${prompt}\n(The user is currently on the page: ${location.pathname || '/'})`,
        modelId,
        mode: 'hub-help',
      };
      const data = await aiApi.chat(body, abortRef.current.signal);
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: data.reply || '' }]);
    } catch (err) {
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: aiErrorMessage(err), error: true }]);
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }, [sending, location.pathname, user]);

  function doClose() {
    if (sending && abortRef.current) abortRef.current.abort();
    setPanelOpen(false);
  }

  if (inWorkspace) return null; // the full workspace already handles /ai

  return (
    <>
      {!panelOpen && (
        <button type="button" className="aih-fab" onClick={() => setPanelOpen(true)} aria-label="Ask the Hub Helper AI for help">
          <Icon.ai size={22} />
          <span className="aih-fab-label">Ask AI</span>
        </button>
      )}
      {panelOpen && (
        <div className="aih-panel" role="dialog" aria-label="The Tech Guider Hub Helper AI help">
          <div className="aih-head">
            <div className="aih-head-title">
              <Icon.ai size={17} />
              <span>Tech Guider AI — Hub Help</span>
            </div>
            <button type="button" className="aih-close" onClick={doClose} aria-label="Close help">
              <Icon.close size={17} />
            </button>
          </div>

          <div className="aih-msgs" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="aih-welcome">
                <p className="aih-welcome-title">Salam! 👋 Koi cheez samajh nahi aa rahi?</p>
                <p className="aih-welcome-sub">
                  Website ke pages, tools, AI plans aur payments — sab samjha deta hoon.
                  Neeche suggestion tap karein ya apna sawal likhein.
                </p>
                <div className="aih-suggests">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="aih-suggest" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`aih-msg ${m.role}`}>
                <div className="aih-bubble">
                  {m.pending ? (
                    <span className="aih-typing"><i /><i /><i /></span>
                  ) : (
                    <span className="aih-text">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            className="aih-composer"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={sending ? 'Please wait…' : 'Ask anything about the Hub…'}
              disabled={sending}
              aria-label="Ask the hub AI helper"
            />
            <button type="submit" className="aih-send" disabled={!input.trim() || sending} aria-label="Send">
              <Icon.arrow size={16} />
            </button>
          </form>
          <div className="aih-foot">
            <span>Poora chat ke liye workspace kholain —</span>
            <Link to="/ai" onClick={doClose}>Open full AI workspace</Link>
          </div>
        </div>
      )}
    </>
  );
}

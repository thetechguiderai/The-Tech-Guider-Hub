// Client for The Tech Guider AI backend, which is served from the same origin
// under /ai/api/*. Auth is an httpOnly cookie (tg_session) set by the backend,
// so requests must be sent with credentials and the JSON error envelope
// (error / code / requestId) is preserved for the UI to display honestly.
async function aiRequest(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options,
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!res.ok) {
    const err = new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data && data.code;
    err.requestId = data && data.requestId;
    err.data = data;
    throw err;
  }
  return data;
}

export const aiApi = {
  me: () => aiRequest('/ai/api/auth/me'),
  login: (body) => aiRequest('/ai/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  signup: (body) => aiRequest('/ai/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => aiRequest('/ai/api/auth/logout', { method: 'POST' }),
  models: () => aiRequest('/ai/api/models'),
  plans: () => aiRequest('/ai/api/plans'),
  usage: () => aiRequest('/ai/api/usage'),
  getSettings: () => aiRequest('/ai/api/user/settings'),
  updateSettings: (body) => aiRequest('/ai/api/user/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  providerStatus: () => aiRequest('/ai/api/providers/status'),
  billingMethods: () => aiRequest('/ai/api/billing/methods'),
  conversations: () => aiRequest('/ai/api/conversations'),
  conversation: (id) => aiRequest(`/ai/api/conversations/${id}`),
  deleteConversation: (id) => aiRequest(`/ai/api/conversations/${id}`, { method: 'DELETE' }),
  chat: (body, signal) =>
    aiRequest('/ai/api/chat', { method: 'POST', body: JSON.stringify(body), signal }),
};

// Turns any thrown error (from aiApi) into a friendly, actionable message.
// Distinguishes the categories the backend reports via `code`.
export function aiErrorMessage(err) {
  if (!err) return 'Something went wrong. Please try again.';
  if (err.name === 'AbortError') return 'Request cancelled.';
  const code = err.code;
  if (code === 'provider_not_configured') return err.message;
  if (code === 'provider_auth') return 'The AI provider credentials are invalid. An administrator needs to update the provider key.';
  if (code === 'provider_quota') return 'The AI provider account has no remaining credit. An administrator needs to top up the provider.';
  if (code === 'provider_rate_limit') return 'The AI is busy right now (provider rate limit). Please retry in a moment.';
  if (code === 'provider_timeout') return 'The AI took too long to respond. Please retry.';
  if (code === 'empty_response') return 'The AI returned an empty response. Please retry.';
  if (code === 'model_unavailable') return 'This model is temporarily unavailable. Try another model.';
  if (err.status === 401) return 'Please sign in to use this model.';
  if (err.status === 429) return err.message || 'You have reached a usage limit. Please try again later.';
  return err.message || 'The AI could not complete your request. Please retry.';
}

export function isRetryable(err) {
  if (!err) return false;
  const code = err.code;
  if (code === 'provider_rate_limit' || code === 'provider_timeout' || code === 'empty_response' || code === 'provider_error') return true;
  return err.status === 429 || err.status === 502 || err.status === 504;
}

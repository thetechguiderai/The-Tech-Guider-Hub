async function request(path, options = {}) {
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
    err.data = data;
    throw err;
  }
  return data;
}

export const publicApi = {
  bootstrap: () => request('/api/public/bootstrap'),
  videos: () => request('/api/public/videos'),
  video: (id) => request(`/api/public/videos/${id}?track=1`),
  resources: (videoId) =>
    request(videoId ? `/api/public/resources?video=${videoId}` : '/api/public/resources'),
  resourceClick: (id) =>
    request(`/api/public/resources/${id}/click`, { method: 'POST', body: '{}' }),
  minecraft: () => request('/api/public/minecraft'),
  youtubeStats: () => request('/api/public/youtube-stats'),
  announcements: () => request('/api/public/announcements'),
  search: (q) => request(`/api/public/search?q=${encodeURIComponent(q)}`),
  generateSensitivity: (payload) =>
    request('/api/public/sensitivity/generate', { method: 'POST', body: JSON.stringify(payload) }),
  analytics: (type, target, detail) =>
    request('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ type, target, detail }),
    }).catch(() => null),
};

export const ownerApi = {
  login: (code) =>
    request('/api/owner/login', { method: 'POST', body: JSON.stringify({ code }) }),
  logout: () => request('/api/owner/logout', { method: 'POST' }),
  session: () => request('/api/owner/session'),
  regenerateCode: () => request('/api/owner/regenerate-code', { method: 'POST' }),
  upload: (dataUrl, folder) =>
    request('/api/owner/upload', { method: 'POST', body: JSON.stringify({ dataUrl, folder }) }),

  overview: () => request('/api/owner/overview'),

  videos: () => request('/api/owner/videos'),
  createVideo: (body) => request('/api/owner/videos', { method: 'POST', body: JSON.stringify(body) }),
  updateVideo: (id, body) => request(`/api/owner/videos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVideo: (id) => request(`/api/owner/videos/${id}`, { method: 'DELETE' }),

  resources: () => request('/api/owner/resources'),
  createResource: (body) => request('/api/owner/resources', { method: 'POST', body: JSON.stringify(body) }),
  updateResource: (id, body) => request(`/api/owner/resources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteResource: (id) => request(`/api/owner/resources/${id}`, { method: 'DELETE' }),
  reorderResources: (ids) => request('/api/owner/resources/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),

  youtubeConfig: () => request('/api/owner/youtube-config'),
  updateYoutube: (body) => request('/api/owner/youtube-config', { method: 'PUT', body: JSON.stringify(body) }),
  youtubeRefresh: () => request('/api/owner/youtube-refresh', { method: 'POST' }),

  sensitivityProfiles: () => request('/api/owner/sensitivity-profiles'),
  createProfile: (body) => request('/api/owner/sensitivity-profiles', { method: 'POST', body: JSON.stringify(body) }),
  updateProfile: (id, body) => request(`/api/owner/sensitivity-profiles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProfile: (id) => request(`/api/owner/sensitivity-profiles/${id}`, { method: 'DELETE' }),

  minecraft: () => request('/api/owner/minecraft'),
  createMinecraft: (body) => request('/api/owner/minecraft', { method: 'POST', body: JSON.stringify(body) }),
  updateMinecraft: (id, body) => request(`/api/owner/minecraft/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMinecraft: (id) => request(`/api/owner/minecraft/${id}`, { method: 'DELETE' }),

  rewards: () => request('/api/owner/rewards'),
  createReward: (body) => request('/api/owner/rewards', { method: 'POST', body: JSON.stringify(body) }),
  updateReward: (id, body) => request(`/api/owner/rewards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  revealReward: (id) => request(`/api/owner/rewards/${id}/reveal`, { method: 'POST' }),
  deleteReward: (id) => request(`/api/owner/rewards/${id}`, { method: 'DELETE' }),

  announcements: () => request('/api/owner/announcements'),
  createAnnouncement: (body) => request('/api/owner/announcements', { method: 'POST', body: JSON.stringify(body) }),
  updateAnnouncement: (id, body) => request(`/api/owner/announcements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAnnouncement: (id) => request(`/api/owner/announcements/${id}`, { method: 'DELETE' }),

  analytics: (days = 14) => request(`/api/owner/analytics?since=${days}`),
  settings: () => request('/api/owner/settings'),
  updateSettings: (body) => request('/api/owner/settings', { method: 'PUT', body: JSON.stringify(body) }),

  auditLogs: (limit = 100) => request(`/api/owner/audit-logs?limit=${limit}`),
  clearAudit: () => request('/api/owner/audit-logs/clear', { method: 'POST' }),
};
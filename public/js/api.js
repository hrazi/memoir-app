// HTTP client for all server API calls

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  // Handle file downloads
  const contentDisposition = res.headers.get('Content-Disposition');
  if (contentDisposition && contentDisposition.includes('attachment')) {
    const blob = await res.blob();
    const filename = contentDisposition.match(/filename="?([^"]+)"?/)?.[1] || 'download';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    return null;
  }
  return res.json();
}

// Project-scoped helper
function p(projectId) {
  return `api/projects/${projectId}`;
}

export const api = {
  // Projects (top-level)
  listProjects: () => request('api/projects'),
  createProject: (data) => request('api/projects', { method: 'POST', body: data }),
  deleteProject: (id) => request(`api/projects/${id}`, { method: 'DELETE' }),

  // Project details
  getProject: (id) => request(`${p(id)}`),
  saveProject: (id, data) => request(`${p(id)}`, { method: 'PUT', body: data }),

  // Memories
  getMemories: (projectId) => request(`${p(projectId)}/memories`),
  createMemory: (projectId, data) => request(`${p(projectId)}/memories`, { method: 'POST', body: data }),
  updateMemory: (projectId, id, data) => request(`${p(projectId)}/memories/${id}`, { method: 'PUT', body: data }),
  deleteMemory: (projectId, id) => request(`${p(projectId)}/memories/${id}`, { method: 'DELETE' }),

  // Chapters
  getChapters: (projectId) => request(`${p(projectId)}/chapters`),
  createChapter: (projectId, data) => request(`${p(projectId)}/chapters`, { method: 'POST', body: data }),
  updateChapter: (projectId, id, data) => request(`${p(projectId)}/chapters/${id}`, { method: 'PUT', body: data }),
  deleteChapter: (projectId, id) => request(`${p(projectId)}/chapters/${id}`, { method: 'DELETE' }),
  reorderChapters: (projectId, order) => request(`${p(projectId)}/chapters/reorder`, { method: 'PUT', body: { order } }),

  // AI
  aiExpand: (projectId, text, memories) => request(`${p(projectId)}/ai/expand`, { method: 'POST', body: { text, memories } }),
  aiPolish: (projectId, text) => request(`${p(projectId)}/ai/polish`, { method: 'POST', body: { text } }),
  aiFollowUp: (projectId, question, answer) => request(`${p(projectId)}/ai/follow-up`, { method: 'POST', body: { question, answer } }),
  aiSuggestStructure: (projectId, memories) => request(`${p(projectId)}/ai/suggest-structure`, { method: 'POST', body: { memories } }),
  aiContinue: (projectId, text, memories) => request(`${p(projectId)}/ai/continue`, { method: 'POST', body: { text, memories } }),
  aiSensoryDetails: (projectId, text) => request(`${p(projectId)}/ai/sensory-details`, { method: 'POST', body: { text } }),
  aiDialogue: (projectId, text) => request(`${p(projectId)}/ai/dialogue`, { method: 'POST', body: { text } }),
  aiSuggestTitle: (projectId, text) => request(`${p(projectId)}/ai/suggest-title`, { method: 'POST', body: { text } }),
  aiSummarize: (projectId, text) => request(`${p(projectId)}/ai/summarize`, { method: 'POST', body: { text } }),

  // Upload
  uploadImage: async (projectId, file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`api/projects/${projectId}/upload`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
    return data;
  },

  // Export
  exportHTML: (projectId) => request(`${p(projectId)}/export/html`),
  exportText: (projectId) => request(`${p(projectId)}/export/text`),
  exportJSON: (projectId) => request(`${p(projectId)}/export/json`),
};

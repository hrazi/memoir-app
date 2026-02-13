// Home screen - list and manage multiple memoirs

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { loadProject } from '../app.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderHome(container) {
  const state = getState();
  const projects = state.projects || [];

  container.innerHTML = `
    <div class="welcome-container" style="justify-content: flex-start; padding-top: 60px;">
      <h1>Your Memoirs</h1>
      <p class="subtitle">Each memoir is its own guided journey. Pick up where you left off, or start a new story.</p>

      <div class="home-projects" style="width: 100%; max-width: 600px; margin-top: 8px;">
        ${projects.length > 0 ? projects.map(p => `
          <div class="card home-project-card" data-id="${p.id}" style="margin-bottom: 12px; cursor: pointer; display: flex; align-items: center; gap: 16px;">
            <div style="flex: 1; text-align: left;">
              <div style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 600;">${escapeHTML(p.title || 'Untitled Memoir')}</div>
              <div style="font-size: 0.82rem; color: var(--text-light); margin-top: 2px;">by ${escapeHTML(p.author || 'Anonymous')}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Created ${formatDate(p.createdAt)}</div>
            </div>
            <button class="btn btn-danger btn-sm delete-project-btn" data-id="${p.id}" title="Delete memoir" style="flex-shrink: 0;">&times;</button>
          </div>
        `).join('') : `
          <div class="empty-state" style="padding: 32px;">
            <div class="empty-icon" style="font-size: 2rem;">&#128214;</div>
            <h3>No memoirs yet</h3>
            <p>Start your first memoir below.</p>
          </div>
        `}
      </div>

      <button class="btn btn-primary btn-lg" style="margin-top: 24px;" id="new-memoir-btn">+ New Memoir</button>
    </div>
  `;

  // Open an existing memoir
  container.querySelectorAll('.home-project-card').forEach(card => {
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.delete-project-btn')) return;
      const id = card.dataset.id;
      await loadProject(id);
      window.location.hash = '#interview';
    });
  });

  // Delete a memoir
  container.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const proj = projects.find(p => p.id === id);
      showModal({
        title: 'Delete Memoir',
        message: `Delete "${proj?.title || 'Untitled'}"? All memories, chapters, and writing will be permanently lost.`,
        confirmText: 'Delete',
        danger: true,
        onConfirm: async () => {
          await api.deleteProject(id);
          const updated = await api.listProjects();
          setState({ projects: updated });
          // If we deleted the currently loaded project, clear it
          if (getState().currentProjectId === id) {
            setState({ currentProjectId: null, project: null, memories: [], chapters: [] });
          }
          renderHome(container);
          showToast('Memoir deleted', 'default');
        },
      });
    });
  });

  // New memoir
  document.getElementById('new-memoir-btn').addEventListener('click', () => {
    window.location.hash = '#welcome';
  });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

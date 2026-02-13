// Sidebar navigation

import { getState } from '../state.js';
import { unloadProject } from '../app.js';

const navItems = [
  { id: 'interview', label: 'Interview', icon: '\u270D' },
  { id: 'memories', label: 'Memories', icon: '\uD83D\uDCDD' },
  { id: 'chapters', label: 'Chapters', icon: '\uD83D\uDCD6' },
  { id: 'editor', label: 'Editor', icon: '\u2712' },
  { id: 'preview', label: 'Preview', icon: '\uD83D\uDC41' },
  { id: 'export', label: 'Export', icon: '\uD83D\uDCE5' },
];

// --- Mobile hamburger menu ---

function ensureMobileNav() {
  if (document.getElementById('mobile-nav-toggle')) return;

  const btn = document.createElement('button');
  btn.id = 'mobile-nav-toggle';
  btn.className = 'mobile-nav-toggle';
  btn.setAttribute('aria-label', 'Open navigation');
  btn.textContent = '\u2630';
  document.body.appendChild(btn);

  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.id = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  btn.addEventListener('click', toggleMobileNav);
  backdrop.addEventListener('click', closeMobileNav);
}

function toggleMobileNav() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('sidebar-open')) {
    closeMobileNav();
  } else {
    sidebar.classList.add('sidebar-open');
    document.getElementById('sidebar-backdrop').classList.add('visible');
  }
}

function closeMobileNav() {
  document.getElementById('sidebar').classList.remove('sidebar-open');
  document.getElementById('sidebar-backdrop').classList.remove('visible');
}

// --- Render ---

export function renderNav() {
  const sidebar = document.getElementById('sidebar');
  const state = getState();
  const current = state.currentView;
  const project = state.project;

  ensureMobileNav();

  if (!project || !state.currentProjectId) {
    sidebar.classList.add('hidden');
    return;
  }
  sidebar.classList.remove('hidden');

  const totalMemories = state.memories.length;
  const totalChapters = state.chapters.length;

  sidebar.innerHTML = `
    <div class="nav-brand">
      <h2>${project.title || 'My Memoir'}</h2>
      <div class="nav-subtitle">by ${project.author || ''}</div>
    </div>
    <ul class="nav-links">
      ${navItems.map(item => `
        <li>
          <a href="#${item.id}" class="${current === item.id ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span>
            ${item.label}
          </a>
        </li>
      `).join('')}
    </ul>
    <div class="nav-progress">
      <div class="nav-progress-label">${totalMemories} memories \u00B7 ${totalChapters} chapters</div>
      <div class="nav-progress-bar">
        <div class="nav-progress-fill" style="width: ${Math.min(100, (totalMemories / 62) * 100)}%"></div>
      </div>
    </div>
    <div style="padding: 12px 20px; border-top: 1px solid var(--border-light);">
      <button class="btn btn-ghost btn-sm" id="back-to-memoirs" style="width: 100%;">&larr; All Memoirs</button>
    </div>
  `;

  // Close mobile menu when any nav link is clicked
  sidebar.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  document.getElementById('back-to-memoirs')?.addEventListener('click', () => {
    closeMobileNav();
    unloadProject();
  });
}

// Hash-based router and view management

import { api } from './api.js';
import { getState, setState, subscribe } from './state.js';
import { renderNav } from './components/nav.js';
import { renderHome } from './views/home.js';
import { renderWelcome } from './views/welcome.js';
import { renderInterview } from './views/interview.js';
import { renderMemories } from './views/memories.js';
import { renderChapters } from './views/chapters.js';
import { renderEditor } from './views/editor.js';
import { renderPreview } from './views/preview.js';
import { renderExport } from './views/export.js';

const views = {
  home: renderHome,
  welcome: renderWelcome,
  interview: renderInterview,
  memories: renderMemories,
  chapters: renderChapters,
  editor: renderEditor,
  preview: renderPreview,
  export: renderExport,
};

// Views that don't require a loaded project
const noProjectViews = new Set(['home', 'welcome']);

function getRoute() {
  const hash = window.location.hash.slice(1) || '';
  const view = hash.split('?')[0] || 'home';
  return view;
}

async function navigate() {
  const view = getRoute();
  const main = document.getElementById('main-content');
  const state = getState();

  // If trying to access a project view but no project is loaded, redirect to home
  if (!noProjectViews.has(view) && !state.currentProjectId) {
    window.location.hash = '#home';
    return;
  }

  setState({ currentView: view });

  // Toggle sidebar and full-width mode
  if (noProjectViews.has(view)) {
    main.classList.add('full-width');
  } else {
    main.classList.remove('full-width');
  }

  // Render nav
  renderNav();

  // Render view
  const renderFn = views[view];
  if (renderFn) {
    main.innerHTML = '';
    renderFn(main);
  } else {
    main.innerHTML = `<div class="content-center"><h2>Page not found</h2><p><a href="#home">Go Home</a></p></div>`;
  }
}

// Load a project's data into state
export async function loadProject(projectId) {
  const [project, memories, chapters] = await Promise.all([
    api.getProject(projectId),
    api.getMemories(projectId),
    api.getChapters(projectId),
  ]);
  setState({ currentProjectId: projectId, project, memories, chapters });
}

// Unload project and go back to home
export function unloadProject() {
  setState({ currentProjectId: null, project: null, memories: [], chapters: [] });
  window.location.hash = '#home';
}

async function init() {
  // Load project list
  const projects = await api.listProjects();
  setState({ projects });

  // Check if URL has a project context (e.g., coming back with hash)
  // We store the current project ID in sessionStorage for tab persistence
  const savedProjectId = sessionStorage.getItem('memoir-current-project');
  const view = getRoute();

  if (savedProjectId && !noProjectViews.has(view)) {
    try {
      await loadProject(savedProjectId);
    } catch {
      sessionStorage.removeItem('memoir-current-project');
      window.location.hash = '#home';
      navigate();
      return;
    }
  }

  navigate();
}

// Persist current project ID to sessionStorage
subscribe('session', (state) => {
  if (state.currentProjectId) {
    sessionStorage.setItem('memoir-current-project', state.currentProjectId);
  } else {
    sessionStorage.removeItem('memoir-current-project');
  }
});

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Subscribe to state changes for nav updates
subscribe('nav', () => renderNav());

// Boot
init();

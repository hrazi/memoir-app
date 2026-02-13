// Onboarding screen for creating a new memoir

import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { loadProject } from '../app.js';
import { showToast } from '../components/toast.js';

export function renderWelcome(container) {
  container.innerHTML = `
    <div class="welcome-container">
      <h1>Let\u2019s write your story</h1>
      <p class="subtitle">Everyone has a story worth telling. This app will guide you through remembering, organizing, and writing your memoir \u2014 one question at a time.</p>

      <div class="welcome-steps">
        <div class="welcome-step">
          <div class="welcome-step-num">1</div>
          <h4>Remember</h4>
          <p>Answer guided questions about your life, one at a time</p>
        </div>
        <div class="welcome-step">
          <div class="welcome-step-num">2</div>
          <h4>Organize</h4>
          <p>Arrange your memories into chapters</p>
        </div>
        <div class="welcome-step">
          <div class="welcome-step-num">3</div>
          <h4>Write</h4>
          <p>Turn memories into polished prose with AI help</p>
        </div>
      </div>

      <div class="welcome-form">
        <div class="form-group">
          <label for="book-title">What would you like to call your memoir?</label>
          <input type="text" id="book-title" class="input" placeholder="e.g., A Life Well Lived" />
        </div>
        <div class="form-group">
          <label for="author-name">Your name</label>
          <input type="text" id="author-name" class="input" placeholder="e.g., John Smith" />
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%; margin-top: 8px;" id="begin-btn">Begin Your Story</button>
        <button class="btn btn-ghost" style="width:100%; margin-top: 8px;" id="back-btn">&larr; Back to My Memoirs</button>
      </div>
    </div>
  `;

  document.getElementById('begin-btn').addEventListener('click', async () => {
    const title = document.getElementById('book-title').value.trim();
    const author = document.getElementById('author-name').value.trim();
    if (!author) {
      showToast('Please enter your name to get started.', 'error');
      return;
    }
    const project = await api.createProject({
      title: title || 'My Memoir',
      author,
    });
    // Refresh project list and load the new project
    const projects = await api.listProjects();
    setState({ projects });
    await loadProject(project.id);
    window.location.hash = '#interview';
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.hash = '#home';
  });
}

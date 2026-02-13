// Client-side state store with change notifications

const listeners = new Map();
let state = {
  currentProjectId: null,
  project: null,
  projects: [],
  memories: [],
  chapters: [],
  currentView: 'home',
  interviewStage: 0,
  interviewQuestion: 0,
};

export function getState() {
  return state;
}

export function setState(updates) {
  state = { ...state, ...updates };
  notify();
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

function notify() {
  for (const [, fns] of listeners) {
    for (const fn of fns) fn(state);
  }
}

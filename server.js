import 'dotenv/config';
import express from 'express';
import { readFile, writeFile, mkdir, readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = join(__dirname, 'data');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname, 'public')));

// --- Data helpers ---
async function ensureDir(dir) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

function projectDir(projectId) {
  return join(DATA_DIR, projectId);
}

async function readJSON(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, 'utf-8'));
}

async function writeJSON(filePath, data) {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

// --- Migration: move flat data/ files into a subdirectory ---
async function migrateIfNeeded() {
  const oldProject = join(DATA_DIR, 'project.json');
  if (!existsSync(oldProject)) return;
  const proj = JSON.parse(await readFile(oldProject, 'utf-8'));
  const id = Date.now().toString();
  const dir = projectDir(id);
  await ensureDir(dir);
  await writeFile(join(dir, 'project.json'), JSON.stringify({ ...proj, id }, null, 2));
  for (const f of ['memories.json', 'chapters.json']) {
    const src = join(DATA_DIR, f);
    if (existsSync(src)) {
      const data = await readFile(src, 'utf-8');
      await writeFile(join(dir, f), data);
      await rm(src);
    }
  }
  await rm(oldProject);
}

// --- Projects (list / create / delete) ---
app.get('/api/projects', async (req, res) => {
  await ensureDir(DATA_DIR);
  const entries = await readdir(DATA_DIR, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const proj = await readJSON(join(DATA_DIR, entry.name, 'project.json'), null);
    if (proj) projects.push({ ...proj, id: entry.name });
  }
  projects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(projects);
});

app.post('/api/projects', async (req, res) => {
  const id = Date.now().toString();
  const project = { id, createdAt: new Date().toISOString(), interviewStage: 0, interviewQuestion: 0, ...req.body };
  const dir = projectDir(id);
  await ensureDir(dir);
  await writeJSON(join(dir, 'project.json'), project);
  await writeJSON(join(dir, 'memories.json'), []);
  await writeJSON(join(dir, 'chapters.json'), []);
  res.json(project);
});

app.delete('/api/projects/:projectId', async (req, res) => {
  const dir = projectDir(req.params.projectId);
  if (existsSync(dir)) await rm(dir, { recursive: true });
  res.json({ ok: true });
});

// --- Project details ---
app.get('/api/projects/:projectId', async (req, res) => {
  const proj = await readJSON(join(projectDir(req.params.projectId), 'project.json'), null);
  if (!proj) return res.status(404).json({ error: 'Project not found' });
  res.json({ ...proj, id: req.params.projectId });
});

app.put('/api/projects/:projectId', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'project.json');
  const existing = await readJSON(file, {});
  const updated = { ...existing, ...req.body, id: req.params.projectId };
  await writeJSON(file, updated);
  res.json(updated);
});

// --- Memories ---
app.get('/api/projects/:projectId/memories', async (req, res) => {
  res.json(await readJSON(join(projectDir(req.params.projectId), 'memories.json'), []));
});

app.post('/api/projects/:projectId/memories', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'memories.json');
  const memories = await readJSON(file, []);
  const memory = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...req.body };
  memories.push(memory);
  await writeJSON(file, memories);
  res.json(memory);
});

app.put('/api/projects/:projectId/memories/:id', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'memories.json');
  const memories = await readJSON(file, []);
  const idx = memories.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  memories[idx] = { ...memories[idx], ...req.body, updatedAt: new Date().toISOString() };
  await writeJSON(file, memories);
  res.json(memories[idx]);
});

app.delete('/api/projects/:projectId/memories/:id', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'memories.json');
  let memories = await readJSON(file, []);
  memories = memories.filter(m => m.id !== req.params.id);
  await writeJSON(file, memories);
  res.json({ ok: true });
});

// --- Chapters ---
app.get('/api/projects/:projectId/chapters', async (req, res) => {
  res.json(await readJSON(join(projectDir(req.params.projectId), 'chapters.json'), []));
});

app.post('/api/projects/:projectId/chapters', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'chapters.json');
  const chapters = await readJSON(file, []);
  const chapter = { id: Date.now().toString(), memoryIds: [], content: '', createdAt: new Date().toISOString(), ...req.body };
  chapters.push(chapter);
  await writeJSON(file, chapters);
  res.json(chapter);
});

app.put('/api/projects/:projectId/chapters/reorder', async (req, res) => {
  const { order } = req.body;
  const file = join(projectDir(req.params.projectId), 'chapters.json');
  const chapters = await readJSON(file, []);
  const sorted = order.map(id => chapters.find(c => c.id === id)).filter(Boolean);
  chapters.forEach(c => { if (!order.includes(c.id)) sorted.push(c); });
  await writeJSON(file, sorted);
  res.json(sorted);
});

app.put('/api/projects/:projectId/chapters/:id', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'chapters.json');
  const chapters = await readJSON(file, []);
  const idx = chapters.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  chapters[idx] = { ...chapters[idx], ...req.body, updatedAt: new Date().toISOString() };
  await writeJSON(file, chapters);
  res.json(chapters[idx]);
});

app.delete('/api/projects/:projectId/chapters/:id', async (req, res) => {
  const file = join(projectDir(req.params.projectId), 'chapters.json');
  let chapters = await readJSON(file, []);
  chapters = chapters.filter(c => c.id !== req.params.id);
  await writeJSON(file, chapters);
  res.json({ ok: true });
});

// --- AI Proxy ---
function getAI() {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    return null;
  }
  return new Anthropic();
}

async function aiRequest(systemPrompt, userContent) {
  const ai = getAI();
  if (!ai) return { error: 'API key not configured. Add your ANTHROPIC_API_KEY to .env file.' };
  try {
    const msg = await ai.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
    return { text: msg.content[0].text };
  } catch (err) {
    const apiMsg = err?.error?.error?.message || err.message || 'Unknown AI error';
    return { error: apiMsg };
  }
}

app.post('/api/projects/:projectId/ai/expand', async (req, res) => {
  const { text, memories } = req.body;
  const ctx = memories ? `\n\nReference memories:\n${memories}` : '';
  const result = await aiRequest(
    'You are a warm, skilled memoir ghostwriter. Expand the following notes into vivid, first-person narrative prose suitable for a memoir. Maintain the author\'s voice. Be descriptive and emotionally resonant but not overwrought. Write 2-4 paragraphs.',
    text + ctx
  );
  res.json(result);
});

app.post('/api/projects/:projectId/ai/polish', async (req, res) => {
  const { text } = req.body;
  const result = await aiRequest(
    'You are a gentle, skilled memoir editor. Polish the following memoir text for clarity, flow, and emotional resonance. Preserve the author\'s voice and style. Fix grammar and awkward phrasing. Return only the improved text.',
    text
  );
  res.json(result);
});

app.post('/api/projects/:projectId/ai/follow-up', async (req, res) => {
  const { question, answer } = req.body;
  const result = await aiRequest(
    'You are a warm interviewer helping someone write their memoir. Based on their answer to a question, generate 3 thoughtful follow-up questions that dig deeper into the memory. Be specific and evocative. Format as a numbered list.',
    `Original question: ${question}\n\nTheir answer: ${answer}`
  );
  res.json(result);
});

app.post('/api/projects/:projectId/ai/suggest-structure', async (req, res) => {
  const { memories } = req.body;
  const summary = memories.map((m, i) => `${i + 1}. [${m.stage}] ${m.question}: ${m.answer?.substring(0, 150)}...`).join('\n');
  const result = await aiRequest(
    'You are a memoir structure advisor. Based on these collected memories, suggest a chapter structure for the memoir. For each chapter, give a title and list which memory numbers should be included. Return valid JSON: an array of objects with "title" (string) and "memoryIndices" (array of 1-based numbers). Return ONLY the JSON array, no other text.',
    summary
  );
  res.json(result);
});

// --- Export ---
app.get('/api/projects/:projectId/export/json', async (req, res) => {
  const dir = projectDir(req.params.projectId);
  const project = await readJSON(join(dir, 'project.json'), {});
  const memories = await readJSON(join(dir, 'memories.json'), []);
  const chapters = await readJSON(join(dir, 'chapters.json'), []);
  res.setHeader('Content-Disposition', 'attachment; filename="memoir-backup.json"');
  res.json({ project, memories, chapters, exportedAt: new Date().toISOString() });
});

app.get('/api/projects/:projectId/export/text', async (req, res) => {
  const dir = projectDir(req.params.projectId);
  const project = await readJSON(join(dir, 'project.json'), {});
  const chapters = await readJSON(join(dir, 'chapters.json'), []);
  let text = `${project.title || 'My Memoir'}\nby ${project.author || 'Anonymous'}\n\n`;
  chapters.forEach((ch, i) => {
    text += `${'='.repeat(40)}\nChapter ${i + 1}: ${ch.title || 'Untitled'}\n${'='.repeat(40)}\n\n${ch.content || '(No content yet)'}\n\n`;
  });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${(project.title || 'memoir').replace(/[^a-z0-9]/gi, '_')}.txt"`);
  res.send(text);
});

app.get('/api/projects/:projectId/export/html', async (req, res) => {
  const dir = projectDir(req.params.projectId);
  const project = await readJSON(join(dir, 'project.json'), {});
  const chapters = await readJSON(join(dir, 'chapters.json'), []);
  const title = project.title || 'My Memoir';
  const author = project.author || '';
  let toc = '';
  let body = '';
  chapters.forEach((ch, i) => {
    const chTitle = ch.title || `Chapter ${i + 1}`;
    toc += `<li><a href="#ch${i}">${chTitle}</a></li>`;
    body += `<div class="chapter" id="ch${i}"><h2>${chTitle}</h2><div>${ch.content || '<p><em>No content yet.</em></p>'}</div></div>`;
  });
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
body{font-family:'Lora',serif;max-width:700px;margin:0 auto;padding:40px 20px;color:#2C2C2C;background:#FAF8F5;line-height:1.8}
h1{text-align:center;font-size:2.4em;margin-bottom:0.2em}
.author{text-align:center;font-size:1.2em;color:#666;margin-bottom:2em}
h2{font-size:1.6em;margin-top:2em;padding-top:1em;border-top:1px solid #ddd}
.toc{margin:2em 0;padding:1.5em;background:#f5f0eb;border-radius:8px}
.toc h3{margin-top:0}
.toc ul{list-style:none;padding-left:0}
.toc li{margin:0.5em 0}
.toc a{color:#2D6A4F;text-decoration:none}
.chapter{margin-bottom:3em}
blockquote{border-left:3px solid #2D6A4F;margin-left:0;padding-left:1em;color:#555;font-style:italic}
@media print{body{padding:0;background:white}.toc{page-break-after:always}}
</style></head><body>
<h1>${title}</h1>
${author ? `<p class="author">by ${author}</p>` : ''}
${chapters.length > 1 ? `<div class="toc"><h3>Table of Contents</h3><ul>${toc}</ul></div>` : ''}
${body}
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}.html"`);
  res.send(html);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Boot
await migrateIfNeeded();

// Phusion Passenger (Bluehost/cPanel) compatibility
if (typeof globalThis.PhusionPassenger !== 'undefined') {
  globalThis.PhusionPassenger.configure({ autoInstall: false });
  app.listen('passenger', () => {
    console.log('Memoir Writing Assistant running via Passenger');
  });
} else {
  app.listen(PORT, () => {
    console.log(`Memoir Writing Assistant running at http://localhost:${PORT}`);
  });
}

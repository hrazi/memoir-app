import { Client } from 'basic-ftp';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readdirSync, statSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Recursively collect all files under a local directory
function collectFiles(dir, base = '') {
  const results = [];
  for (const entry of readdirSync(join(__dirname, dir, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFiles(dir, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

// Static files: upload from public/ locally → /abbu-book/ root on server
const staticFiles = collectFiles('public').map(f => ({
  local: `public/${f}`,
  remote: `/abbu-book/${f}`,
}));

// PHP API files (config.php excluded — contains API key, managed manually on server)
const phpFiles = [
  { local: 'api/index.php', remote: '/abbu-book/api/index.php' },
];

// Config files
const configFiles = [
  { local: '.htaccess', remote: '/abbu-book/.htaccess' },
  { local: 'data/.htaccess', remote: '/abbu-book/data/.htaccess' },
  { local: 'uploads/.htaccess', remote: '/abbu-book/uploads/.htaccess' },
];

const ALL_FILES = [...configFiles, ...phpFiles, ...staticFiles];

async function deploy() {
  const client = new Client();
  try {
    await client.access({
      host: 'ftp.hrazi.com',
      user: 'haider@hrazi.com',
      password: 'Ahad2021!',
      secure: false,
    });
    console.log('Connected to FTP server');

    // Ensure directories exist
    const dirs = new Set();
    for (const f of ALL_FILES) {
      const dir = f.remote.substring(0, f.remote.lastIndexOf('/'));
      dirs.add(dir);
    }
    for (const dir of [...dirs].sort()) {
      try { await client.ensureDir(dir); } catch {}
    }

    // Upload files
    for (const file of ALL_FILES) {
      const localPath = join(__dirname, file.local);
      console.log(`${file.local} -> ${file.remote}`);
      await client.uploadFrom(localPath, file.remote);
    }

    console.log(`\nDone! ${ALL_FILES.length} files uploaded.`);
    console.log('Visit: https://hrazi.com/abbu-book/');
  } catch (err) {
    console.error('FTP error:', err.message);
  } finally {
    client.close();
  }
}

deploy();

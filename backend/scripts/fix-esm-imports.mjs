import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Node ESM requires explicit extensions for relative imports.
 * TypeScript (with moduleResolution=bundler) emits extensionless relative specifiers like:
 *   import { x } from './db/connection';
 * This script rewrites JS files under backend/dist/ (recursively) to:
 *   import { x } from './db/connection.js';
 */

const DIST_DIR = path.resolve(process.cwd(), 'dist');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function shouldAppendJs(spec) {
  if (!(spec.startsWith('./') || spec.startsWith('../'))) return false;
  if (spec.endsWith('/')) return false;
  const ext = path.posix.extname(spec).toLowerCase();
  // Treat only real runtime extensions as "already has extension".
  // Names like `auth.routes` or `invoice.service` are NOT extensions in ESM terms.
  const knownRuntimeExts = new Set(['.js', '.mjs', '.cjs', '.json', '.node', '.wasm']);
  if (ext === '') return true;
  return !knownRuntimeExts.has(ext);
}

async function exists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

function toPosixPath(p) {
  return p.split(path.win32.sep).join(path.posix.sep);
}

async function resolveSpecifier(filePath, spec) {
  if (!shouldAppendJs(spec)) return spec;

  const baseDir = path.dirname(filePath);
  const resolvedNoExt = path.resolve(baseDir, spec);

  // Prefer explicit file match first: ./x -> ./x.js
  if (await exists(`${resolvedNoExt}.js`)) {
    return `${spec}.js`;
  }

  // Then directory index match: ./x -> ./x/index.js
  const indexJs = path.join(resolvedNoExt, 'index.js');
  if (await exists(indexJs)) {
    // Ensure URL-style path separators in ESM specifiers
    return toPosixPath(`${spec}/index.js`);
  }

  return spec;
}

async function rewriteFile(filePath, content) {
  // Handles: import ... from '...';  export ... from '...';
  // (also handles double quotes)
  const re = /\b(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g;

  let out = '';
  let lastIdx = 0;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(content)) !== null) {
    const [full, p1, spec, p3] = match;
    const start = match.index;
    const end = start + full.length;

    out += content.slice(lastIdx, start);
    const newSpec = await resolveSpecifier(filePath, spec);
    out += `${p1}${newSpec}${p3}`;

    lastIdx = end;
  }

  out += content.slice(lastIdx);
  return out;
}

async function main() {
  const files = await walk(DIST_DIR);
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  let changedCount = 0;
  for (const filePath of jsFiles) {
    const original = await readFile(filePath, 'utf8');
    const rewritten = await rewriteFile(filePath, original);
    if (rewritten !== original) {
      await writeFile(filePath, rewritten, 'utf8');
      changedCount++;
    }
  }

  if (changedCount > 0) {
    console.log(`[fix-esm-imports] Updated ${changedCount} file(s) in dist/`);
  } else {
    console.log('[fix-esm-imports] No changes needed');
  }
}

await main();



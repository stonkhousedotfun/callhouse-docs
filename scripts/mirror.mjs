#!/usr/bin/env node
// Root content is the source; GitBook publishes the byte-identical docs/ tree.
import { copyFile, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const args = process.argv.slice(2);
if (args.length !== 1 || !['--write', '--check'].includes(args[0])) {
  console.error('usage: node scripts/mirror.mjs --write|--check');
  process.exit(2);
}

const skipRootFiles = new Set([
  'AGENTS.md', 'CLAUDE.md', 'HANDOFF.md', 'PUBLISH.md', 'V2.md', '.gitbook.yaml', '.gitignore',
  '.pre-commit-config.yaml',
]);
const skipRootDirs = new Set(['docs', 'scripts', 'node_modules', '.git']);

async function filesUnder(base, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(base, prefix), { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(base, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function sourceFiles() {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile() && !skipRootFiles.has(entry.name) && /\.(md|ya?ml)$/.test(entry.name)) {
      out.push(entry.name);
    } else if (entry.isDirectory() && !skipRootDirs.has(entry.name) && !entry.name.startsWith('.')) {
      out.push(...await filesUnder(root, entry.name));
    }
  }
  const assetRoot = path.join(root, '.gitbook', 'assets');
  if (await stat(assetRoot).then(() => true).catch(() => false)) {
    out.push(...await filesUnder(root, path.join('.gitbook', 'assets')));
  }
  return out.sort();
}

const source = await sourceFiles();
if (args[0] === '--write') {
  await rm(docs, { recursive: true, force: true });
  await mkdir(docs, { recursive: true });
  for (const relative of source) {
    const destination = path.join(docs, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(root, relative), destination);
  }
  console.log(`mirrored ${source.length} content files into docs/`);
} else {
  const actual = await stat(docs).then(() => filesUnder(docs)).catch(() => []);
  const expectedSet = new Set(source);
  const actualSet = new Set(actual);
  const drift = [];
  for (const relative of source) {
    if (!actualSet.has(relative)) {
      drift.push(`missing docs/${relative}`);
      continue;
    }
    const [a, b] = await Promise.all([readFile(path.join(root, relative)), readFile(path.join(docs, relative))]);
    if (!a.equals(b)) drift.push(`changed docs/${relative}`);
  }
  for (const relative of actual) if (!expectedSet.has(relative)) drift.push(`extra docs/${relative}`);
  if (drift.length) {
    console.error(drift.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`mirror OK — ${source.length} content files`);
  }
}

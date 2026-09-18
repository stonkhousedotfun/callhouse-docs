#!/usr/bin/env node
// Verify local Markdown targets in both GitBook content trees.
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excluded = new Set(['scripts', 'node_modules', '.git']);

async function markdownFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !excluded.has(entry.name) && !entry.name.startsWith('.')) {
      out.push(...await markdownFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.md') && !['HANDOFF.md', 'V2.md'].includes(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const failures = [];
const files = await markdownFiles(root);
let checked = 0;
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const withoutFences = text.replace(/^```[\s\S]*?^```/gm, '');
  const pattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of withoutFences.matchAll(pattern)) {
    let target = match[1].trim().replace(/^<|>$/g, '').split('#', 1)[0].split('?', 1)[0];
    if (!target || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('/')) continue;
    try { target = decodeURIComponent(target); } catch { failures.push(`${path.relative(root, file)}: invalid URI ${target}`); continue; }
    if (!target.endsWith('.md')) continue;
    checked++;
    if (!existsSync(path.resolve(path.dirname(file), target))) {
      failures.push(`${path.relative(root, file)}: broken link ${match[1]}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`links OK — ${checked} relative Markdown links in ${files.length} pages`);
}

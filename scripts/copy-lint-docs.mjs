#!/usr/bin/env node
/** Public docs copy gate. Keep FORBIDDEN in step with callhouse/scripts/copy-lint.mjs. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FORBIDDEN = [
  /\bAPY\b/i,
  /\bAPR\b/i,
  /10\s*%\s*weekly/i,
  /projected\s+(yield|return|apy|income)/i,
  /annuali[sz]ed/i,
  /backed\s+by\s+nvidia/i,
  /dividend\s+paid\s+(in\s+cash\s+)?by\s+nvidia/i,
  /guaranteed\s+(yield|return|premium)/i,
  /risk[-\s]?free/i,
];
const DOCS_ONLY = [/tokenized\s+(stocks|equities)/i, /\bguaranteed\b/i];
const contentDirs = ['getting-started', 'buying', 'writing', 'market', 'product', 'protocol', 'legacy', 'resources'];
const contentFiles = ['README.md', 'SUMMARY.md', 'roadmap.md'];

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(file) : entry.isFile() && file.endsWith('.md') ? [file] : [];
  });
}

function lint(value, name) {
  const errors = [];
  for (const [i, line] of value.split('\n').entries()) {
    for (const re of [...FORBIDDEN, ...DOCS_ONLY]) {
      if (re.test(line)) errors.push(`${name}:${i + 1}: ${re}`);
    }
  }
  // Catch copy split over Markdown line breaks, like the app copy gate does.
  const flat = value.replace(/\s+/g, ' ');
  for (const re of [...FORBIDDEN, ...DOCS_ONLY]) {
    if (re.test(flat) && !errors.some((error) => error.endsWith(String(re)))) {
      errors.push(`${name}: across lines: ${re}`);
    }
  }
  return errors;
}

if (lint('a projected\nyield claim', 'self-test').length === 0 || lint('Fees and full cost.', 'self-test').length) {
  throw new Error('copy lint self-test failed');
}

// A docs-only CI checkout can run standalone; in this workspace we also fail on pattern drift.
const appCandidates = [resolve(root, '../callhouse/scripts/copy-lint.mjs'), resolve(root, '../../callhouse/scripts/copy-lint.mjs')];
const appScript = appCandidates.find(existsSync);
if (appScript) {
  const code = readFileSync(appScript, 'utf8');
  const match = code.match(/const FORBIDDEN = \[([\s\S]*?)\n\];/);
  if (!match) throw new Error(`cannot read app copy patterns from ${appScript}`);
  const appPatterns = runInNewContext(`[${match[1]}]`).map((item) => String(item.re));
  if (JSON.stringify(appPatterns) !== JSON.stringify(FORBIDDEN.map(String))) {
    throw new Error(`docs copy patterns differ from ${appScript}`);
  }
}

const pages = [...contentFiles.map((file) => join(root, file)), ...contentDirs.flatMap((dir) => filesUnder(join(root, dir)))];
const failures = pages.flatMap((file) => lint(readFileSync(file, 'utf8'), file.slice(root.length + 1)));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`docs copy OK — ${pages.length} pages${appScript ? ', app patterns match' : ''}`);
}

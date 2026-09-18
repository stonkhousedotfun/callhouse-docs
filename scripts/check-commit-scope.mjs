#!/usr/bin/env node
// Commit-time guard for accidentally publishing local release/development state.
// The release manifest still requires human review; this guard is not an allowlist.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = process.env.GIT ?? 'git';

function forbiddenPath(file) {
  const name = file.split('/').at(-1);
  if ((/^\.env(?:\..+)?$/i.test(name) || /\.env$/i.test(name)) && !/\.(?:example|sample|template)$/i.test(name)) return 'non-template environment file';
  if (/(^|\/)(?:AGENTS|CLAUDE|HANDOFF|PUBLISH|V2|TIER1-STATUS|STATUS-[^/]*)\.md$/i.test(file)) return 'internal planning/agent guide';
  if (/(^|\/)(?:internal|private|ops|deploy|runbooks|secrets|planning|drafts|scratch)(\/|$)/i.test(file)) return 'internal or private directory';
  if (/(^|\/)(?:broadcast|env-dev|rehearsal-logs?|\.env-dev)(\/|$)/i.test(file)) return 'development deployment artifact';
  if (/(^|\/)(?:\.next|node_modules|\.turbo|coverage|dist|out|cache)(\/|$)/i.test(file)) return 'generated build/cache artifact';
  if (/(^|\/)(?:dev\.json|rehearsal-passed\.json|deploy\.log)$/i.test(file)) return 'development deployment artifact';
  if (/\.(?:pem|key|p12|pfx|sqlite|db|log)$/i.test(file)) return 'key, database, or runtime log';
  if (/\.(?:md|mdx|markdown)$/i.test(name)) {
    const publicPage = /^(?:docs\/)?(?:README|SUMMARY|roadmap)\.md$|^(?:docs\/)?(?:getting-started|buying|writing|market|product|protocol|legacy|resources)\/[a-z0-9][a-z0-9/_-]*\.md$/i;
    if (!publicPage.test(file)) return 'Markdown is outside the reviewed public docs tree';
  }
  return null;
}

function forbiddenText(value) {
  if (/\/Users\/[^\s/]+\/Desktop\/robinhood-dev|\/private\/tmp\/|wt\/callhouse|github\.com\/leekzor\//i.test(value)) {
    return 'private workspace or remote reference';
  }
  return null;
}

if (process.argv.includes('--self-test')) {
  assert.equal(forbiddenPath('README.md'), null);
  assert.equal(forbiddenPath('docs/product/risks.md'), null);
  assert.equal(forbiddenPath('docs/notes.MARKDOWN'), 'Markdown is outside the reviewed public docs tree');
  assert.equal(forbiddenPath('docs/protocol/HANDOFF.md'), 'internal planning/agent guide');
  assert.equal(forbiddenPath('docs/private/release.md'), 'internal or private directory');
  assert.equal(forbiddenPath('ops/.env.production'), 'non-template environment file');
  assert.equal(forbiddenPath('ops/service.env'), 'non-template environment file');
  assert.equal(forbiddenPath('.env.example'), null);
  assert.equal(forbiddenPath('ops/markets/dev.json'), 'internal or private directory');
  assert.equal(forbiddenPath('.next/cache/preview.json'), 'generated build/cache artifact');
  assert.equal(forbiddenPath('product/markets.md'), null);
  assert.equal(forbiddenText('see wt/' + 'callhouse-private'), 'private workspace or remote reference');
  assert.equal(forbiddenText('public release'), null);
  console.log('scope guard self-test passed');
  process.exit(0);
}

const failures = [];
try {
  const tree = process.argv.includes('--tree');
  const paths = execFileSync(git, tree ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '--no-renames', '-z'])
    .toString('utf8').split('\0').filter(Boolean);
  const present = tree ? new Set(paths) : new Set(execFileSync(git, ['diff', '--cached', '--name-only', '--no-renames', '--diff-filter=ACMR', '-z'])
    .toString('utf8').split('\0').filter(Boolean));
  for (const file of paths) {
    const reason = forbiddenPath(file);
    if (reason) failures.push(`${file}: ${reason}`);
    if (!present.has(file)) continue;
    if (!/\.(?:md|mdx|txt|json|ya?ml|toml|[cm]?js|tsx?|html|css|sh)$/i.test(file) && !file.startsWith('.env')) continue;
    const content = tree ? readFileSync(file) : execFileSync(git, ['show', `:${file}`], { maxBuffer: 20 * 1024 * 1024 });
    if (content.includes(0)) continue;
    const textReason = forbiddenText(content.toString('utf8'));
    if (textReason) failures.push(`${file}: ${textReason}`);
  }
  if (!tree) execFileSync(git, ['diff', '--cached', '--check'], { stdio: 'pipe' });
} catch (error) {
  console.error(`scope guard could not inspect the staged snapshot: ${error.message}`);
  process.exit(2);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(process.argv.includes('--tree') ? 'tracked public docs tree OK' : 'staged scope and whitespace OK');

#!/usr/bin/env node

/**
 * scripts/export-oss.mjs
 *
 * Exports the open-source part of this private monorepo into a clean directory
 * that is committed to the public `cdal` repository. Only allowlisted paths are
 * copied, a few files get public variants, and a leak scan fails the export if
 * anything internal (client names, sales material, local paths) slips through.
 *
 * Usage:
 *   node scripts/export-oss.mjs <target-dir>
 *
 * The target directory may be an existing clone of the public repo: everything
 * except its .git folder is replaced.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const target = process.argv[2];

if (!target) {
  console.error('Usage: node scripts/export-oss.mjs <target-dir>');
  process.exit(1);
}

const TARGET = path.resolve(target);
if (TARGET === ROOT || TARGET.startsWith(`${ROOT}${path.sep}`)) {
  console.error('The target directory must be outside this repository.');
  process.exit(1);
}

const ALLOW = [
  '.agents',
  '.changeset',
  '.claude',
  '.cursor',
  '.github',
  '.gitignore',
  '.nvmrc',
  'AGENTS.md',
  'CLAUDE.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'SECURITY.md',
  'biome.json',
  'cdal.config.mjs',
  'contracts',
  'content/docs',
  'docs/generated',
  'docs/manual-vibecoding.md',
  'examples',
  'packages',
  'renovate.json',
  'scripts/gen-cli-docs.mjs',
  'scripts/export-oss.mjs',
  'tsconfig.base.json',
  'tsconfig.json',
  'turbo.json',
];

const SKIP = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)\.turbo(\/|$)/,
  /(^|\/)\.cdal(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)\.DS_Store$/,
  /^packages\/core\/src\/_legacy(\/|$)/,
  /(^|\/)\.env(\.|$)(?!example)/,
  /\.tsbuildinfo$/,
];

// Anything matching these in an exported file stops the export.
const LEAKS = [
  /klik\s*klima/i,
  /piotrek/i,
  /\/Users\/[a-z]/i,
  /docs\/sales/i,
  /docs\/marketing/i,
  /production-plan/i,
  /apps\/web\/(src|messages|e2e|public|test)\b/i,
  /trello/i,
  /_legacy/,
];

// Only files tracked by git are exported, so local .env files or build output never leak.
const TRACKED = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

function copyAllowed(prefix) {
  const files = TRACKED.filter((f) => f === prefix || f.startsWith(`${prefix}/`));
  if (files.length === 0) {
    console.error(`Allowlisted path is missing: ${prefix}`);
    process.exit(1);
  }
  for (const rel of files) {
    if (SKIP.some((re) => re.test(rel))) continue;
    const dest = path.join(TARGET, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
}

function writeTransformed(rel, transform) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const out = transform(src);
  fs.writeFileSync(path.join(TARGET, rel), out);
}

function replaceOrFail(text, from, to, file) {
  if (!text.includes(from)) {
    console.error(`Expected text not found in ${file}: ${from.slice(0, 60)}`);
    process.exit(1);
  }
  return text.replace(from, to);
}

// 1. Clean the target, keeping its git history.
fs.mkdirSync(TARGET, { recursive: true });
for (const entry of fs.readdirSync(TARGET)) {
  if (entry === '.git') continue;
  fs.rmSync(path.join(TARGET, entry), { recursive: true, force: true });
}

// 2. Copy allowlisted paths.
for (const rel of ALLOW) copyAllowed(rel);

// 3. Public variants of shared root files.
writeTransformed('pnpm-workspace.yaml', (s) => s.replace(/^\s*- 'apps\/\*'\n/m, ''));

// Text edit (not JSON.stringify) to keep the file's formatting intact.
writeTransformed('package.json', (s) => s.replace(/\n\s*"tapes": "[^"]*",/, ''));

writeTransformed('README.md', (s) => {
  let out = s;
  out = replaceOrFail(
    out,
    '[Case Studies](./content/case-study)',
    '[Case Study](https://cdal-henna.vercel.app/case-study)',
    'README.md',
  );
  out = replaceOrFail(
    out,
    'Please read our [Architecture Decision Records](./docs/decisions) and ensure',
    'Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and ensure',
    'README.md',
  );
  return out;
});

writeTransformed('CHANGELOG.md', (s) =>
  // Drop the website and sales sections: they live in the private repository.
  s
    .replace(/- \*\*apps\/web:\*\*[\s\S]*?(?=\n- \*\*|\n## |$)/, '')
    .replace(/- \*\*docs\/sales & docs\/marketing:\*\*[\s\S]*?(?=\n- \*\*|\n## |$)/, ''),
);

// The private-only _legacy folder is not exported, so drop its exclude entries.
const stripLegacy = (s) =>
  s
    .replace(/,\s*"\*\*\/_legacy\/\*\*"/g, '')
    .replace(/,\s*"src\/_legacy"/g, '')
    .replace(/\n\s*"\*\*\/_legacy\/\*\*",/g, '');
for (const rel of ['tsconfig.json', 'biome.json', 'packages/core/tsconfig.json']) {
  writeTransformed(rel, stripLegacy);
}

// Reuse the monorepo lockfile, pruned to the exported workspaces.
fs.copyFileSync(path.join(ROOT, 'pnpm-lock.yaml'), path.join(TARGET, 'pnpm-lock.yaml'));
execFileSync('pnpm', ['install', '--lockfile-only'], { cwd: TARGET, stdio: 'ignore' });

// 4. Leak scan.
const hits = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scan(full);
      continue;
    }
    const rel = path.relative(TARGET, full);
    if (rel === path.join('scripts', 'export-oss.mjs')) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const re of LEAKS) {
      const m = text.match(re);
      if (m) hits.push(`${rel}: ${m[0]}`);
    }
  }
}
scan(TARGET);

if (hits.length > 0) {
  console.error('❌ Leak scan failed — internal content found in the export:');
  for (const hit of hits) console.error(`   ${hit}`);
  process.exit(1);
}

console.log(`✅ Exported the open-source tree to ${TARGET} (leak scan clean).`);

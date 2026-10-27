import { execSync } from 'node:child_process';
import path from 'node:path';
import { isProtectedPath, isTestPath } from '../guard/guard.js';
import type { PhaseCheckResult, PhaseOptions, PhaseType } from './types.js';

function isDocsFile(filePath: string): boolean {
  return filePath.startsWith('docs/') || filePath.endsWith('.md') || filePath.endsWith('.mdx');
}

export function getChangedGitFiles(cwd: string, base?: string): string[] {
  let rawFiles: string[] = [];
  try {
    const cmd = base
      ? `git diff --name-only ${base}...HEAD && git diff --name-only`
      : 'git diff --name-only HEAD && git status --porcelain --untracked-files=all | sed "s/^...//"';

    const output = execSync(cmd, { cwd, encoding: 'utf8', shell: '/bin/bash' });
    rawFiles = output
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }

  // Adjust for cases where cwd is a subfolder of the git repo
  let gitPrefix = '';
  try {
    const toplevel = execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf8' }).trim();
    const rel = path.relative(toplevel, cwd).replace(/\\/g, '/');
    if (rel && !rel.startsWith('..')) {
      gitPrefix = `${rel}/`;
    }
  } catch {
    // Not a git repository or command failed
  }

  let normalizedFiles = rawFiles;
  if (gitPrefix) {
    normalizedFiles = rawFiles
      .filter((f) => f.startsWith(gitPrefix))
      .map((f) => f.slice(gitPrefix.length));
  }

  // Normalize, deduplicate, and exclude internal states
  return [...new Set(normalizedFiles)]
    .map((f) => f.replace(/\\/g, '/'))
    .filter((f) => !f.startsWith('.cdal/state/') && !f.startsWith('.claude/state/'));
}

export function checkPhase(phase: PhaseType, options: PhaseOptions = {}): PhaseCheckResult {
  const cwd = options.cwd ?? process.cwd();
  const protectedPatterns = options.protectedPaths ?? ['contracts/', 'src/generated/contracts/'];

  const files = options.files ?? getChangedGitFiles(cwd, options.base);

  const isContract = (f: string) => isProtectedPath(f, protectedPatterns);
  const isTest = (f: string) => isTestPath(f);
  const isDocs = (f: string) => isDocsFile(f);

  const PHASE_CONFIG: Record<
    PhaseType,
    { label: string; why: string; illegal: (f: string) => boolean }
  > = {
    red: {
      label: 'RED — tests and documentation only',
      why: 'In RED phase, only tests and documentation can be authored. Modifying production code indicates that tests and implementation were authored together.',
      illegal: (f: string) => !isTest(f) && !isDocs(f),
    },
    green: {
      label: 'GREEN — implementation only',
      why: 'In GREEN phase, tests and contracts are immutable specifications. If a test is wrong, escalate to a human reviewer rather than editing tests to fit implementation.',
      illegal: (f: string) => isTest(f) || isContract(f),
    },
    contract: {
      label: 'CONTRACT — contracts and documentation only',
      why: 'Contract window is reserved exclusively for single sources of truth. Implementation code must be developed in a subsequent cycle.',
      illegal: (f: string) => !isContract(f) && !isDocs(f),
    },
  };

  const currentRule = PHASE_CONFIG[phase];
  if (!currentRule) {
    throw new Error(`Invalid phase "${phase}". Must be one of: red, green, contract.`);
  }

  const violations = files.filter(currentRule.illegal);
  const ok = violations.length === 0 && (phase !== 'red' || files.length > 0);

  return {
    phase,
    files,
    violations,
    ok,
    why: currentRule.why,
    label: currentRule.label,
  };
}

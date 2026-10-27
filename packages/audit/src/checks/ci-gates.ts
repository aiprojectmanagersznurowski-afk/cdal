import { readFileSync } from 'node:fs';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

export function checkCiGates(files: WorkspaceFiles, weight = 15): AuditCheckResult {
  const findings: AuditFinding[] = [];

  if (files.ciFiles.length === 0) {
    findings.push({
      message: 'No CI configuration files (.github/workflows/, .gitlab-ci.yml, etc.).',
      severity: 'error',
    });
    return {
      id: 'ci-gates',
      name: 'Automated CI quality gates (pull request gates)',
      weight,
      score: 0,
      maxScore: weight,
      passed: false,
      details: 'The repository has no CI pipelines checking code on pull requests.',
      findings,
      docsUrl: 'https://cdal.dev/docs/concepts/gates#ci-pipeline',
    };
  }

  let runsTests = false;
  let runsTypecheckOrLint = false;
  let runsCdalVerify = false;
  let triggersOnPr = false;

  const testCommandRegex =
    /\b(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?(?:test|verify)\b|\bvitest\b|\bjest\b|\bpytest\b|\bcargo\s+test\b/i;
  const typecheckRegex =
    /\b(?:tsc|typecheck|pnpm\s+typecheck|npm\s+run\s+typecheck|biome|eslint|lint|verify)\b/i;
  const cdalVerifyRegex = /(?:cdal(?:\.mjs)?\s+verify|pnpm\s+verify)/i;
  const prTriggerRegex = /\b(?:pull_request|merge_requests|mr)\b/i;

  for (const file of files.ciFiles) {
    let content = '';
    try {
      content = readFileSync(file.absolutePath, 'utf8');
    } catch {
      continue;
    }

    if (prTriggerRegex.test(content)) triggersOnPr = true;
    if (testCommandRegex.test(content)) runsTests = true;
    if (typecheckRegex.test(content)) runsTypecheckOrLint = true;
    if (cdalVerifyRegex.test(content)) runsCdalVerify = true;
  }

  // cdal verify encompasses both tests and typechecks
  if (runsCdalVerify) {
    runsTests = true;
    runsTypecheckOrLint = true;
  }

  let score = 0;
  let details = '';

  if (runsTests && runsTypecheckOrLint && triggersOnPr) {
    score = weight;
    details = `Exemplary CI gates in ${files.ciFiles.length} workflow(s): automated tests and static analysis on every pull request.`;
  } else if (runsTests && runsTypecheckOrLint) {
    score = Math.round(weight * 0.8);
    details =
      'The CI workflow runs tests and typecheck, but is not explicitly triggered on the pull_request event.';
    findings.push({
      message: 'Make sure the CI workflow runs automatically on the pull_request event.',
      severity: 'warn',
    });
  } else if (runsTests) {
    score = Math.round(weight * 0.55);
    details =
      'CI runs unit tests, but there is no hard typecheck/lint step preventing type errors from being merged.';
    findings.push({
      message: 'No typecheck / lint step in the CI pipeline.',
      severity: 'warn',
    });
  } else {
    score = Math.round(weight * 0.25);
    details = `Found CI files (${files.ciFiles.map((f) => f.relativePath).join(', ')}), but they don't run automated tests.`;
    findings.push({
      message: 'None of the CI workflows run automated tests.',
      severity: 'error',
    });
  }

  return {
    id: 'ci-gates',
    name: 'Automated CI quality gates (pull request gates)',
    weight,
    score,
    maxScore: weight,
    passed: score >= weight * 0.7,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/concepts/gates#ci-pipeline',
  };
}

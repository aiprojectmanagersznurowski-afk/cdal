import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

export function checkRequirementTraceability(files: WorkspaceFiles, weight = 10): AuditCheckResult {
  const findings: AuditFinding[] = [];

  const requirementFileCandidates = [
    'contracts/requirements.contract.mjs',
    'contracts/requirements.contract.ts',
    'docs/requirements.md',
    'spec/requirements.md',
    'docs/workorders',
    'docs/00-METHODOLOGY.md',
  ];

  let hasRequirementDoc = false;
  let foundDocPath = '';
  for (const candidate of requirementFileCandidates) {
    if (existsSync(join(files.cwd, candidate))) {
      hasRequirementDoc = true;
      foundDocPath = candidate;
      break;
    }
  }

  // Scan tests for @REQ: or similar requirement trace markers
  // Note: we dynamically build the regex so the audit source file itself doesn't contain a literal @REQ tag that might interfere with trace tools
  const reqTagRegex = new RegExp(`//\\s*@(?:${'REQ'}|${'REQUIREMENT'}):\\s*([A-Za-z0-9_-]+)`, 'g');
  let tagCount = 0;
  const taggedFiles = new Set<string>();

  for (const file of files.testFiles) {
    let content = '';
    try {
      content = readFileSync(file.absolutePath, 'utf8');
    } catch {
      continue;
    }

    const matches = content.matchAll(reqTagRegex);
    for (const _match of matches) {
      tagCount++;
      taggedFiles.add(file.relativePath);
    }
  }

  let score = 0;
  let details = '';

  if (hasRequirementDoc && tagCount > 0) {
    score = weight;
    details = `Full traceability: requirements registry (${foundDocPath}) and ${tagCount} trace tags in ${taggedFiles.size} test files.`;
  } else if (tagCount > 0) {
    score = Math.round(weight * 0.6);
    details = `Found ${tagCount} requirement tags in tests, but no central requirements registry or contract.`;
    findings.push({
      message:
        'No formal requirements registry (contracts/requirements.contract.mjs or docs/requirements.md).',
      severity: 'warn',
    });
  } else if (hasRequirementDoc) {
    score = Math.round(weight * 0.5);
    details = `Found a requirements registry (${foundDocPath}), but tests have no trace tags (@REQ). Coverage cannot be verified.`;
    findings.push({
      message: 'Tests do not link to requirement IDs via @REQ: tags.',
      severity: 'warn',
    });
  } else {
    score = 0;
    details =
      'No requirement traceability at all: no requirements registry and no trace tags in tests.';
    findings.push({
      message: 'No requirements registry and no link between tests and requirements.',
      severity: 'error',
    });
  }

  return {
    id: 'requirement-traceability',
    name: 'Requirement-to-test traceability (@REQ)',
    weight,
    score,
    maxScore: weight,
    passed: score >= weight * 0.7,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/concepts/loop#trace',
  };
}

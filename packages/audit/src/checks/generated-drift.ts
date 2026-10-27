import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

export function checkGeneratedDrift(files: WorkspaceFiles, weight = 5): AuditCheckResult {
  const findings: AuditFinding[] = [];
  const generatedFiles: string[] = [];

  const bannerRegex =
    /(?:@generated|do not edit|automatically generated|wygenerowane automatycznie)/i;

  for (const file of files.allFiles) {
    if (file.relativePath.includes('checks/generated-drift.ts')) {
      continue;
    }

    let content = '';
    try {
      content = readFileSync(file.absolutePath, 'utf8');
    } catch {
      continue;
    }

    // Inspect first 10 lines for generated banner
    const firstLines = content.split('\n').slice(0, 10).join('\n');
    if (bannerRegex.test(firstLines)) {
      generatedFiles.push(file.relativePath);
    }
  }

  // Check if repository enforces drift verification
  let hasDriftCheck = false;
  const packageJsonPath = join(files.cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const scripts = JSON.stringify(pkg.scripts || {});
      if (
        scripts.includes('codegen --check') ||
        scripts.includes('diff --exit-code') ||
        scripts.includes('verify')
      ) {
        hasDriftCheck = true;
      }
    } catch {
      // ignore
    }
  }

  // Check CI workflows for codegen check
  for (const ciFile of files.ciFiles) {
    try {
      const ciContent = readFileSync(ciFile.absolutePath, 'utf8');
      if (
        ciContent.includes('codegen --check') ||
        ciContent.includes('git diff --exit-code') ||
        ciContent.includes('cdal verify')
      ) {
        hasDriftCheck = true;
      }
    } catch {
      // ignore
    }
  }

  let score = 0;
  let details = '';

  if (generatedFiles.length === 0) {
    score = weight;
    details = 'No generated files found in the repository (no silent drift risk).';
  } else if (hasDriftCheck) {
    score = weight;
    details = `Found ${generatedFiles.length} generated files protected by automated drift detection (codegen --check / verify).`;
  } else {
    score = Math.round(weight * 0.4);
    details = `Found ${generatedFiles.length} generated files (${generatedFiles.slice(0, 3).join(', ')}...), but no automated drift check (e.g. cdal codegen --check) in CI.`;
    findings.push({
      message: 'Generated files can silently drift without automated verification in CI.',
      severity: 'warn',
    });
  }

  return {
    id: 'generated-drift',
    name: 'Protection against silent drift of generated files',
    weight,
    score,
    maxScore: weight,
    passed: score >= weight * 0.7,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/concepts/contracts#deterministic-codegen',
  };
}

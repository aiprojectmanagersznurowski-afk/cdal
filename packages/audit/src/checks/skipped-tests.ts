import { readFileSync } from 'node:fs';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

export function checkSkippedTests(files: WorkspaceFiles, weight = 10): AuditCheckResult {
  const findings: AuditFinding[] = [];
  let skippedCount = 0;
  let onlyCount = 0;

  const onlyRegex = /^\s*(?:await\s+)?(?:it|test|describe)\.only\s*\(|^\s*(?:fit|fdescribe)\s*\(/;
  const skipRegex = /^\s*(?:await\s+)?(?:it|test|describe)\.skip\s*\(|^\s*(?:xit|xtest)\s*\(/;

  for (const file of files.testFiles) {
    let content = '';
    try {
      content = readFileSync(file.absolutePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (!line) continue;

      // Check for .only (critical: ignores rest of test suite)
      if (onlyRegex.test(line)) {
        onlyCount++;
        findings.push({
          file: file.relativePath,
          line: i + 1,
          message: `Critical test isolation (.only): "${line.trim().slice(0, 80)}"`,
          severity: 'error',
        });
      }

      // Check for .skip
      if (skipRegex.test(line)) {
        skippedCount++;
        if (findings.length < 20) {
          findings.push({
            file: file.relativePath,
            line: i + 1,
            message: `Skipped test (.skip): "${line.trim().slice(0, 80)}"`,
            severity: 'warn',
          });
        }
      }
    }
  }

  let score = 0;
  let details = '';

  if (files.testFiles.length === 0) {
    score = 0;
    details = 'No test files found in the repository!';
    findings.push({
      message: 'No test files (*.test.* / *.spec.* / tests/).',
      severity: 'error',
    });
  } else if (onlyCount > 0) {
    score = 0;
    details = `Critical: found ${onlyCount} occurrences of .only in test files. The rest of the test suite is skipped in CI.`;
  } else if (skippedCount === 0) {
    score = weight;
    details = `No skipped or isolated tests in ${files.testFiles.length} test files.`;
  } else if (skippedCount <= 2) {
    score = Math.round(weight * 0.6);
    details = `Found ${skippedCount} skipped tests (.skip) in the test suite.`;
  } else if (skippedCount <= 5) {
    score = Math.round(weight * 0.3);
    details = `Found ${skippedCount} skipped tests (.skip) in the test suite.`;
  } else {
    score = 0;
    details = `High number of silenced tests: ${skippedCount} tests skipped (.skip).`;
  }

  return {
    id: 'skipped-tests',
    name: 'Skipped or isolated tests (.skip, .only)',
    weight,
    score,
    maxScore: weight,
    passed: score >= weight * 0.7,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/concepts/gates#forbidden-rules',
  };
}

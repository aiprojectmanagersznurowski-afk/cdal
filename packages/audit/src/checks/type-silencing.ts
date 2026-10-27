import { readFileSync } from 'node:fs';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

export function checkTypeSilencing(files: WorkspaceFiles, weight = 15): AuditCheckResult {
  const findings: AuditFinding[] = [];
  let totalSuppressions = 0;

  const patterns = [
    { name: '@ts-ignore', regex: /@ts-ignore\b/g },
    { name: '@ts-expect-error', regex: /@ts-expect-error\b/g },
    { name: 'as any', regex: /\bas\s+any\b/g },
    { name: 'as unknown as', regex: /\bas\s+unknown\s+as\b/g },
  ];

  for (const file of files.sourceFiles) {
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
      for (const pat of patterns) {
        if (pat.regex.test(line)) {
          totalSuppressions++;
          if (findings.length < 15) {
            findings.push({
              file: file.relativePath,
              line: i + 1,
              message: `Wyciszenie typu (${pat.name}): "${line.trim().slice(0, 80)}"`,
              severity: 'warn',
            });
          }
        }
      }
    }
  }

  const kloc = Math.max(0.001, files.totalLOC / 1000);
  const rate = totalSuppressions / kloc;

  let score = 0;
  if (totalSuppressions === 0) {
    score = weight;
  } else if (rate <= 0.5) {
    score = Math.round(weight * 0.8);
  } else if (rate <= 2.0) {
    score = Math.round(weight * 0.5);
  } else if (rate <= 5.0) {
    score = Math.round(weight * 0.25);
  } else {
    score = 0;
  }

  const rateFormatted = rate.toFixed(2);
  const details =
    totalSuppressions === 0
      ? `No type suppressions in ${files.sourceFiles.length} source files (${files.totalLOC} LOC).`
      : `Found ${totalSuppressions} type suppressions in code (density: ${rateFormatted} / 1k LOC across ${files.totalLOC} LOC).`;

  return {
    id: 'type-silencing',
    name: 'TypeScript type silencing (@ts-ignore, as any)',
    weight,
    score,
    maxScore: weight,
    passed: score >= weight * 0.7,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/presets/typescript-strict',
  };
}

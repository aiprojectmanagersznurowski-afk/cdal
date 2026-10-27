import { readFileSync } from 'node:fs';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

interface SecretPattern {
  name: string;
  regex: RegExp;
}

export function checkSecretLeaks(files: WorkspaceFiles, weight = 15): AuditCheckResult {
  const findings: AuditFinding[] = [];

  const secretPatterns: SecretPattern[] = [
    { name: 'Live Secret Key (sk_live_...)', regex: /\bsk_live_[a-zA-Z0-9]{20,}\b/ },
    { name: 'GitHub Personal Access Token', regex: /\bghp_[a-zA-Z0-9]{36}\b/ },
    { name: 'Private Key PEM', regex: /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PGP|PRIVATE) KEY-----/ },
    { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
    { name: 'Slack Token', regex: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*\b/ },
    { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/ },
  ];

  for (const file of files.allFiles) {
    // Skip example files, lockfiles, and audit's own source scanner files
    if (
      file.relativePath.includes('.env.example') ||
      file.relativePath.endsWith('.example') ||
      file.relativePath.includes('pnpm-lock.yaml') ||
      file.relativePath.includes('package-lock.json') ||
      file.relativePath.includes('checks/secret-leaks.ts')
    ) {
      continue;
    }

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

      // Skip commented mock lines in tests or doc examples
      if (line.includes('DUMMY_SECRET_FOR_TEST') || line.includes('EXAMPLE_KEY')) {
        continue;
      }

      for (const pat of secretPatterns) {
        if (pat.regex.test(line)) {
          findings.push({
            file: file.relativePath,
            line: i + 1,
            message: `Potential secret found in the repository: ${pat.name}`,
            snippet: `${line.trim().slice(0, 40)}... [REDACTED]`,
            severity: 'error',
          });
        }
      }
    }
  }

  const score = findings.length === 0 ? weight : 0;
  const details =
    findings.length === 0
      ? `Scanned ${files.allFiles.length} files — no leaked API keys, tokens or private keys.`
      : `Critical security risk: found ${findings.length} potential secrets in tracked files!`;

  return {
    id: 'secret-leaks',
    name: 'No secrets or API keys in code (secret leak detection)',
    weight,
    score,
    maxScore: weight,
    passed: findings.length === 0,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/concepts/gates#forbidden-rules',
  };
}

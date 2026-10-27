/**
 * @cdal/audit
 * Repository AI-quality & agent hygiene scanner.
 * 100% offline, zero network requests, zero telemetry.
 */

import { checkAgentConfig } from './checks/agent-config.js';
import { checkAgentSelfGrading } from './checks/agent-self-grading.js';
import { checkCiGates } from './checks/ci-gates.js';
import { checkGeneratedDrift } from './checks/generated-drift.js';
import { checkRequirementTraceability } from './checks/requirement-traceability.js';
import { checkSecretLeaks } from './checks/secret-leaks.js';
import { checkSkippedTests } from './checks/skipped-tests.js';
import { checkTypeSilencing } from './checks/type-silencing.js';
import { crawlWorkspace } from './crawler.js';
import { renderHtmlReport } from './html-report.js';
import { DEFAULT_WEIGHTS, buildAuditReport } from './scoring.js';
import { renderTerminalReport } from './terminal-report.js';
import type { AuditCheckResult, AuditOptions, AuditReport } from './types.js';

export * from './types.js';
export * from './crawler.js';
export * from './scoring.js';
export * from './html-report.js';
export * from './terminal-report.js';

export {
  checkAgentConfig,
  checkAgentSelfGrading,
  checkCiGates,
  checkGeneratedDrift,
  checkRequirementTraceability,
  checkSecretLeaks,
  checkSkippedTests,
  checkTypeSilencing,
};

export async function runAudit(options: AuditOptions = {}): Promise<AuditReport> {
  const startTime = Date.now();
  const cwd = options.cwd || process.cwd();
  const lang = options.lang || 'en';
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };
  const maxCommits = options.maxCommits || 200;

  const workspace = crawlWorkspace(cwd);

  const checks: AuditCheckResult[] = [
    checkAgentConfig(workspace, weights['agent-config']),
    checkTypeSilencing(workspace, weights['type-silencing']),
    checkSkippedTests(workspace, weights['skipped-tests']),
    checkAgentSelfGrading(workspace, weights['agent-self-grading'], maxCommits),
    checkRequirementTraceability(workspace, weights['requirement-traceability']),
    checkCiGates(workspace, weights['ci-gates']),
    checkSecretLeaks(workspace, weights['secret-leaks']),
    checkGeneratedDrift(workspace, weights['generated-drift']),
  ];

  const durationMs = Date.now() - startTime;

  const stats = {
    totalFiles: workspace.allFiles.length,
    totalLinesOfCode: workspace.totalLOC,
    gitCommitsScanned: maxCommits,
    durationMs,
  };

  return buildAuditReport(cwd, checks, stats, lang);
}

/**
 * Legacy backwards compatibility stub.
 */
export function runAuditMock(): { score: number; checks: unknown[] } {
  return {
    score: 100,
    checks: [],
  };
}

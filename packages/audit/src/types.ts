/**
 * @cdal/audit — types
 * Specification for the CDAL repository audit engine (audit.v1).
 */

export type AuditCheckId =
  | 'agent-config'
  | 'type-silencing'
  | 'skipped-tests'
  | 'agent-self-grading'
  | 'requirement-traceability'
  | 'ci-gates'
  | 'secret-leaks'
  | 'generated-drift';

export type AuditSeverity = 'error' | 'warn' | 'info';

export type AuditBand = 'critical' | 'warning' | 'good' | 'excellent';

export type AuditLanguage = 'en' | 'pl';

export interface AuditFinding {
  file?: string;
  line?: number;
  message: string;
  snippet?: string;
  severity: AuditSeverity;
}

export interface AuditCheckResult {
  id: AuditCheckId;
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  passed: boolean;
  details: string;
  findings: AuditFinding[];
  docsUrl: string;
}

export interface AuditRecommendation {
  id: string;
  checkId: AuditCheckId;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  docsUrl: string;
  remediationSnippet?: string;
}

export interface AuditStats {
  totalFiles: number;
  totalLinesOfCode: number;
  gitCommitsScanned: number;
  durationMs: number;
}

export interface AuditReport {
  $schema: string;
  version: 'audit.v1';
  timestamp: string;
  targetPath: string;
  score: number;
  maxScore: number;
  band: AuditBand;
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
  stats: AuditStats;
  checks: AuditCheckResult[];
  recommendations: AuditRecommendation[];
}

export interface AuditOptions {
  cwd?: string;
  lang?: AuditLanguage;
  weights?: Partial<Record<AuditCheckId, number>>;
  maxCommits?: number;
}

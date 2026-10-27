export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type TraceRequirementStatus = 'TODO' | 'IMPLEMENTING' | 'DONE' | 'BLOCKED';

export interface TraceRequirement {
  id: string;
  statement: string;
  domain: string;
  risk: RiskLevel;
  status: TraceRequirementStatus;
  parent?: string;
}

export interface TestMatch {
  file: string;
  line: number;
  title: string;
}

export interface UnknownTag {
  id: string;
  file: string;
  line: number;
}

export type TraceVerdict = 'NO TEST' | 'TEST FAILING' | 'COVERED ✓' | 'COVERED (no results)';

export interface TraceRow extends TraceRequirement {
  tests: TestMatch[];
  failing: TestMatch[];
  verdict: TraceVerdict;
}

export interface TraceReport {
  schemaVersion: 'trace.v1';
  timestamp: string;
  total: number;
  covered: number;
  coveragePercent: number;
  rows: TraceRow[];
  violations: TraceRow[];
  highRiskUncovered: TraceRow[];
  unknownTags: UnknownTag[];
  ok: boolean;
}

export interface RunTraceOptions {
  cwd?: string;
  enforce?: boolean;
  markdown?: boolean;
  resultsFile?: string;
  searchRoots?: string[];
  requirements?: TraceRequirement[];
}

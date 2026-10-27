import type { ResolvedCdalConfig } from '../config/types.js';

export interface ContentProbe {
  rule: string;
  file: string;
  fires: boolean;
  content: string;
  desc: string;
}

export interface MutationTestResult {
  kindId: string;
  rule: string;
  file: string;
  desc?: string;
  passed: boolean;
  error?: string;
  reason?: string;
}

export interface ProbeTestResult {
  rule: string;
  desc: string;
  passed: boolean;
  fires: boolean;
  firedRule?: string;
  error?: string;
  reason?: string;
}

export interface SelftestReport {
  schemaVersion: 'selftest.v1';
  timestamp: string;
  mutationsPassed: number;
  mutationsTotal: number;
  probesPassed: number;
  probesTotal: number;
  failures: string[];
  ok: boolean;
  mutationResults: MutationTestResult[];
  probeResults: ProbeTestResult[];
}

export interface SelftestOptions {
  cwd?: string;
  config?: ResolvedCdalConfig;
  contractsDir?: string;
  extraProbes?: ContentProbe[];
}

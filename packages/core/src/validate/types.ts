import type { ResolvedCdalConfig } from '../config/types.js';
import type { Finding } from '../kinds/types.js';

export interface FindingsReportV1 {
  version: 'findings.v1';
  valid: boolean;
  stats: {
    errors: number;
    warnings: number;
    total: number;
  };
  findings: Finding[];
}

export interface ValidateOptions {
  contractsDir?: string;
  strict?: boolean;
  cwd?: string;
  config?: ResolvedCdalConfig;
}

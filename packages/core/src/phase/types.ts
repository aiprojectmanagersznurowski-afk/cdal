export type PhaseType = 'contract' | 'red' | 'green';

export interface PhaseCheckResult {
  phase: PhaseType;
  files: string[];
  violations: string[];
  ok: boolean;
  why: string;
  label: string;
}

export interface PhaseOptions {
  cwd?: string;
  base?: string;
  protectedPaths?: string[];
  files?: string[]; // Allow explicit file list for test isolation
}

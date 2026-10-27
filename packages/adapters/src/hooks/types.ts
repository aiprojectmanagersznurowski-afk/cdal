import type { ResolvedCdalConfig } from '@cdal/core';

export type HookName =
  | 'guard-paths'
  | 'guard-forbidden'
  | 'guard-bash'
  | 'session-context'
  | 'log-subagent';

export interface NormalizedHookPayload {
  runtime: 'claude-code' | 'antigravity' | 'generic';
  eventName?: string;
  role?: string;
  sessionId?: string;
  filePath?: string;
  content?: string;
  command?: string;
  raw: Record<string, unknown>;
}

export interface HookExecutionResult {
  blocked: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export interface HookExecutionOptions {
  fallbackRole?: string;
  cwd?: string;
  config?: ResolvedCdalConfig;
  runtime?: 'claude-code' | 'antigravity' | 'generic';
}

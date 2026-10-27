/**
 * @cdal/adapters
 * Runtime hooks and configuration synchronizers for Claude Code, AGENTS.md, Antigravity
 */

export const SUPPORTED_RUNTIMES = ['claude-code', 'agents-md', 'antigravity'] as const;
export type SupportedRuntime = (typeof SUPPORTED_RUNTIMES)[number];

export function isSupportedRuntime(runtime: string): runtime is SupportedRuntime {
  return (SUPPORTED_RUNTIMES as readonly string[]).includes(runtime);
}

export * from './hooks/types.js';
export * from './hooks/payload.js';
export * from './hooks/router.js';
export * from './claude/claude.js';
export * from './agents-md/agents-md.js';
export * from './antigravity/antigravity.js';
export * from './sync/sync.js';

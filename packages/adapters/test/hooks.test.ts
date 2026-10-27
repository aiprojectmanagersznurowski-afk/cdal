import fs from 'node:fs';
import path from 'node:path';
import { resolveConfig } from '@cdal/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeHook, parseHookPayload } from '../src/index.js';

const TEST_DIR = path.resolve(process.cwd(), '.tmp-hooks-test');

describe('Hook Payload Parser (@cdal/adapters)', () => {
  it('parses Claude Code ToolEdit payload correctly', () => {
    const raw = JSON.stringify({
      agent_type: 'implementer',
      session_id: 'sess-123',
      tool_name: 'Edit',
      tool_input: {
        file_path: '/project/src/auth.ts',
        old_string: 'const a = 1;',
        new_string: 'const a = 2;',
      },
    });

    const parsed = parseHookPayload(raw, 'claude-code');
    expect(parsed.runtime).toBe('claude-code');
    expect(parsed.role).toBe('implementer');
    expect(parsed.sessionId).toBe('sess-123');
    expect(parsed.filePath).toBe('/project/src/auth.ts');
    expect(parsed.content).toBe('const a = 2;');
  });

  // @REQ: CDAL-REQ-HOOK-ROUTER
  it('parses Claude Code ToolWrite payload correctly', () => {
    const raw = JSON.stringify({
      agent_type: 'test-author',
      tool_name: 'Write',
      tool_input: {
        file_path: 'tests/feature.test.ts',
        content: 'test("auth", () => {});',
      },
    });

    const parsed = parseHookPayload(raw, 'claude-code');
    expect(parsed.role).toBe('test-author');
    expect(parsed.filePath).toBe('tests/feature.test.ts');
    expect(parsed.content).toBe('test("auth", () => {});');
  });

  it('parses Claude Code ToolBash payload correctly', () => {
    const raw = JSON.stringify({
      agent_type: 'implementer',
      tool_name: 'Bash',
      tool_input: {
        command: 'git push -f origin main',
      },
    });

    const parsed = parseHookPayload(raw, 'claude-code');
    expect(parsed.command).toBe('git push -f origin main');
  });

  it('parses Antigravity / Gemini payload format', () => {
    const raw = JSON.stringify({
      toolAction: 'Editing file',
      TargetFile: '/workspace/src/app.ts',
      CodeContent: 'export const run = () => {};',
    });

    const parsed = parseHookPayload(raw, 'antigravity', 'implementer');
    expect(parsed.runtime).toBe('antigravity');
    expect(parsed.role).toBe('implementer');
    expect(parsed.filePath).toBe('/workspace/src/app.ts');
    expect(parsed.content).toBe('export const run = () => {};');
  });

  it('handles empty or malformed payload without throwing', () => {
    const parsed = parseHookPayload('invalid json', 'claude-code', 'fallback-role');
    expect(parsed.role).toBe('fallback-role');
  });
});

describe('Hook Router Execution (@cdal/adapters)', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  const baseConfig = resolveConfig({
    contractsDir: 'contracts',
    protectedPaths: ['contracts/', 'src/generated/contracts/'],
    roles: {
      'test-author': { write: ['tests/', 'src/**/*.test.ts', '.cdal/state/'] },
      implementer: { write: ['src/', 'app/', '.cdal/state/'], denyTests: true },
      'contract-steward': { write: ['contracts/', 'src/generated/contracts/'] },
    },
    presets: ['typescript-strict', 'safe-defaults'],
  });

  describe('guard-paths hook', () => {
    it('blocks implementer from touching test files with exit 2', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Edit',
        tool_input: {
          file_path: 'tests/billing.test.ts',
          new_string: 'test("mock", () => {})',
        },
      });

      const res = await executeHook('guard-paths', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(true);
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('[guard-paths / implementer] BLOCKED write');
      expect(res.stderr).toContain('physically prohibited from writing or editing test files');
    });

    // @REQ: CDAL-REQ-GUARD-PATH
    it('blocks a role declared in the hook command that is missing from the config', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer-server',
        tool_name: 'Write',
        tool_input: { file_path: 'src/billing.ts', content: 'export {}' },
      });

      const res = await executeHook('guard-paths', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
        fallbackRole: 'implementer-server',
      });

      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('not configured');
    });

    // @REQ: CDAL-REQ-GUARD-PATH
    it('lets built-in subagents through the global hook outside protected paths', async () => {
      const payload = JSON.stringify({
        agent_type: 'general-purpose',
        tool_name: 'Write',
        tool_input: { file_path: 'src/billing.ts', content: 'export {}' },
      });

      const res = await executeHook('guard-paths', payload, { cwd: TEST_DIR, config: baseConfig });
      expect(res.exitCode).toBe(0);
    });

    it('allows implementer to write production code within write scopes (exit 0)', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/billing.ts',
          content: 'export function bill() {}',
        },
      });

      const res = await executeHook('guard-paths', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(false);
      expect(res.exitCode).toBe(0);
      expect(res.stderr).toBeUndefined();
    });

    it('blocks test-author from writing production code (exit 2)', async () => {
      const payload = JSON.stringify({
        agent_type: 'test-author',
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/billing.ts',
          content: 'export function bill() {}',
        },
      });

      const res = await executeHook('guard-paths', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(true);
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('[guard-paths / test-author] BLOCKED write');
    });

    it('blocks modification to protected contracts when window is closed (exit 2)', async () => {
      const payload = JSON.stringify({
        agent_type: 'contract-steward',
        tool_name: 'Write',
        tool_input: {
          file_path: 'contracts/requirements.contract.mjs',
          content: '// updated contract',
        },
      });

      const res = await executeHook('guard-paths', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(true);
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('Contract window is closed');
    });
  });

  describe('guard-forbidden hook', () => {
    it('blocks forbidden pattern (@ts-ignore) with exit 2', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          new_string: '// @ts-ignore\nconst bad = 1;',
        },
      });

      const res = await executeHook('guard-forbidden', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(true);
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('[guard-forbidden] BLOCKED write to: src/billing.ts');
      expect(res.stderr).toContain('[ts-ignore]');
    });

    it('allows clean code without forbidden patterns (exit 0)', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/billing.ts',
          content: 'export const valid: number = 42;',
        },
      });

      const res = await executeHook('guard-forbidden', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(false);
      expect(res.exitCode).toBe(0);
    });
  });

  describe('guard-bash hook', () => {
    it('blocks destructive shell commands with exit 2', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Bash',
        tool_input: {
          command: 'rm -rf /',
        },
      });

      const res = await executeHook('guard-bash', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(true);
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain('[guard-bash] BLOCKED command: rm -rf /');
      expect(res.stderr).toContain('Recursive deletion outside working directory is blocked');
    });

    it('allows safe shell commands (exit 0)', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Bash',
        tool_input: {
          command: 'pnpm test',
        },
      });

      const res = await executeHook('guard-bash', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(false);
      expect(res.exitCode).toBe(0);
    });
  });

  describe('session-context and log-subagent hooks', () => {
    it('returns session context without blocking', async () => {
      const res = await executeHook('session-context', '{}', {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(false);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toBeDefined();
    });

    it('logs subagent lifecycle event to JSONL file without blocking', async () => {
      const payload = JSON.stringify({
        hook_event_name: 'SubagentStart',
        agent_type: 'test-author',
        session_id: 'test-session-42',
      });

      const res = await executeHook('log-subagent', payload, {
        cwd: TEST_DIR,
        config: baseConfig,
      });

      expect(res.blocked).toBe(false);
      expect(res.exitCode).toBe(0);

      const logFile = path.join(TEST_DIR, '.cdal/state/run-log.jsonl');
      expect(fs.existsSync(logFile)).toBe(true);
      const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
      expect(lines).toHaveLength(1);
      const entry = JSON.parse(lines[0] || '{}');
      expect(entry.agent).toBe('test-author');
      expect(entry.event).toBe('SubagentStart');
      expect(entry.session).toBe('test-session-42');
    });
  });

  describe('Performance Budget Benchmark (< 150 ms p95)', () => {
    it('executes 100 consecutive hook calls well below the 150 ms p95 budget', async () => {
      const payload = JSON.stringify({
        agent_type: 'implementer',
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/fast-check.ts',
          content: 'export const speed = "blazing";',
        },
      });

      const times: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await executeHook('guard-paths', payload, {
          cwd: TEST_DIR,
          config: baseConfig,
        });
        times.push(performance.now() - start);
      }

      times.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95Latency = times[p95Index] ?? 0;

      // Assertion: must comfortably satisfy the strict budget (< 150 ms)
      expect(p95Latency).toBeLessThan(150);
    });
  });
});

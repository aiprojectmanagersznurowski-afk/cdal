import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ResolvedCdalConfig } from '@cdal/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeHook } from '../src/hooks/router.js';
import { syncAdapters } from '../src/sync/sync.js';

describe('Adapter Synchronization & E2E Role Blocking', () => {
  let testDir: string;

  const testConfig: ResolvedCdalConfig = {
    contractsDir: 'contracts',
    generated: { ts: 'src/generated/contracts', docs: 'docs/generated' },
    kinds: [],
    protectedPaths: ['contracts/', 'src/generated/contracts/'],
    roles: {
      'spec-analyst': { write: ['docs/workorders/'] },
      'test-author': { write: ['tests/', '**/*.test.ts'] },
      implementer: { write: ['src/', 'app/'], denyTests: true },
      reviewer: { write: ['.cdal/memory/'] },
    },
    presets: ['typescript-strict', 'nextjs'],
    forbidden: [],
    bash: { preset: 'safe-defaults', extra: [] },
    verify: ['pnpm typecheck', 'pnpm test'],
    runtimes: ['claude-code', 'agents-md', 'antigravity'],
  };

  beforeEach(() => {
    testDir = join(tmpdir(), `cdal-sync-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  // @REQ: CDAL-REQ-SYNC
  it('synchronizes all adapter files across enabled runtimes', () => {
    const res = syncAdapters({ cwd: testDir, config: testConfig, check: false });
    expect(res.inSync).toBe(true);
    expect(res.updatedFiles.length).toBe(res.totalFiles);
    expect(res.totalFiles).toBeGreaterThan(15);

    // Running check now should be in sync
    const checkRes = syncAdapters({ cwd: testDir, config: testConfig, check: true });
    expect(checkRes.inSync).toBe(true);
    expect(checkRes.driftedFiles).toHaveLength(0);
  });

  it('detects drift when an adapter file is modified or removed', () => {
    // Initial sync
    syncAdapters({ cwd: testDir, config: testConfig, check: false });

    // Modify a generated file
    const targetFile = join(testDir, '.claude/agents/implementer.md');
    writeFileSync(targetFile, '# Tampered Content\n', 'utf8');

    // Run check
    const checkRes = syncAdapters({ cwd: testDir, config: testConfig, check: true });
    expect(checkRes.inSync).toBe(false);
    expect(checkRes.driftedFiles).toContain('.claude/agents/implementer.md');

    // Re-syncing should fix the drift
    const reSync = syncAdapters({ cwd: testDir, config: testConfig, check: false });
    expect(reSync.updatedFiles).toContain('.claude/agents/implementer.md');

    const checkAgain = syncAdapters({ cwd: testDir, config: testConfig, check: true });
    expect(checkAgain.inSync).toBe(true);
  });

  it('e2e: Next.js fixture blocks implementer role from modifying test files (exit 2)', async () => {
    // Synchronize workspace
    syncAdapters({ cwd: testDir, config: testConfig, check: false });

    // Simulate an implementer attempting to edit a test file
    const testFilePayload = {
      tool_name: 'Edit',
      tool_input: {
        file_path: join(testDir, 'app/components/button.test.tsx'),
      },
    };

    const blockedResult = await executeHook('guard-paths', JSON.stringify(testFilePayload), {
      cwd: testDir,
      config: testConfig,
      fallbackRole: 'implementer',
    });

    expect(blockedResult.exitCode).toBe(2);
    expect(blockedResult.blocked).toBe(true);
    expect(blockedResult.stderr).toContain('BLOCKED');
    expect(blockedResult.stderr).toContain(
      'physically prohibited from writing or editing test files',
    );

    // Implementer modifying production file is allowed
    const prodFilePayload = {
      tool_name: 'Edit',
      tool_input: {
        file_path: join(testDir, 'app/components/button.tsx'),
      },
    };

    const allowedResult = await executeHook('guard-paths', JSON.stringify(prodFilePayload), {
      cwd: testDir,
      config: testConfig,
      fallbackRole: 'implementer',
    });

    expect(allowedResult.exitCode).toBe(0);
    expect(allowedResult.blocked).toBe(false);
  });
});

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncCommand } from '../src/commands/sync.js';

describe('cdal sync CLI command', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `cdal-cli-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    configPath = join(testDir, 'cdal.config.mjs');
    const configContent = `
export default {
  contractsDir: 'contracts',
  generated: { ts: 'src/generated', docs: 'docs/generated' },
  kinds: [],
  protectedPaths: ['contracts/'],
  roles: {
    'spec-analyst': { write: ['docs/workorders/'] },
    'test-author': { write: ['tests/'] },
    implementer: { write: ['src/'], denyTests: true },
    reviewer: { write: ['.cdal/memory/'] },
  },
  presets: ['typescript-strict'],
  forbidden: [],
  bash: { preset: 'safe-defaults', extra: [] },
  verify: ['pnpm typecheck', 'pnpm test'],
  runtimes: ['claude-code', 'agents-md'],
};
`;
    writeFileSync(configPath, configContent, 'utf8');
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  type CommandRunContext = Parameters<NonNullable<typeof syncCommand.run>>[0];

  it('runs sync to generate adapter files', async () => {
    await syncCommand.run?.({
      args: {
        cwd: testDir,
        config: configPath,
        check: false,
      },
      rawArgs: [],
    } as CommandRunContext);

    // Verify check succeeds
    await syncCommand.run?.({
      args: {
        cwd: testDir,
        config: configPath,
        check: true,
      },
      rawArgs: [],
    } as CommandRunContext);
  });

  it('exits with code 1 when check detects drift', async () => {
    // Sync initially
    await syncCommand.run?.({
      args: {
        cwd: testDir,
        config: configPath,
        check: false,
      },
      rawArgs: [],
    } as CommandRunContext);

    // Tamper with generated AGENTS.md
    writeFileSync(join(testDir, 'AGENTS.md'), '# Drifted Content\n', 'utf8');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });

    await expect(
      syncCommand.run?.({
        args: {
          cwd: testDir,
          config: configPath,
          check: true,
        },
        rawArgs: [],
      } as CommandRunContext),
    ).rejects.toThrow('Process exit: 1');

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

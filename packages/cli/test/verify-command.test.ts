import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyCommand } from '../src/commands/verify.js';

describe('cdal verify CLI command', () => {
  let testDir: string;
  let configPath: string;
  type CommandRunContext = Parameters<NonNullable<typeof verifyCommand.run>>[0];

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `cdal-verify-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(testDir, { recursive: true });

    configPath = join(testDir, 'cdal.config.mjs');
    const configContent = `
export default {
  contractsDir: 'contracts',
  generated: { ts: 'src/generated', docs: 'docs/generated' },
  kinds: [],
  protectedPaths: [],
  roles: {},
  presets: [],
  forbidden: [],
  bash: { preset: 'safe-defaults', extra: [] },
  verify: [
    'node -e "process.exit(0)"',
  ],
  runtimes: ['claude-code'],
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

  // @REQ: CDAL-REQ-VERIFY
  it('runs configured verification steps successfully', async () => {
    await verifyCommand.run?.({
      args: {
        cwd: testDir,
        config: configPath,
        fast: false,
        full: false,
        clean: false,
      },
      rawArgs: [],
    } as CommandRunContext);
  });

  it('aborts with non-zero exit code if any verify step fails', async () => {
    const failingConfig = `
export default {
  contractsDir: 'contracts',
  generated: { ts: 'src/generated', docs: 'docs/generated' },
  kinds: [],
  protectedPaths: [],
  roles: {},
  presets: [],
  forbidden: [],
  bash: { preset: 'safe-defaults', extra: [] },
  verify: [
    'node -e "process.exit(42)"',
  ],
  runtimes: ['claude-code'],
};
`;
    writeFileSync(configPath, failingConfig, 'utf8');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });

    await expect(
      verifyCommand.run?.({
        args: {
          cwd: testDir,
          config: configPath,
          fast: false,
          full: false,
          clean: false,
        },
        rawArgs: [],
      } as CommandRunContext),
    ).rejects.toThrow('Process exit: 42');

    expect(exitSpy).toHaveBeenCalledWith(42);
  });
});

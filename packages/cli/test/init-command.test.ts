import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';

describe('cdal init CLI command', () => {
  let testDir: string;
  type CommandRunContext = Parameters<NonNullable<typeof initCommand.run>>[0];

  beforeEach(() => {
    testDir = join(tmpdir(), `cdal-init-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // @REQ: CDAL-REQ-INIT
  it('initializes contracts, configuration, and runtime adapters in empty project', async () => {
    await initCommand.run?.({
      args: {
        cwd: testDir,
        yes: true,
        preset: 'typescript-strict',
        runtime: 'claude-code,agents-md',
      },
      rawArgs: [],
    } as CommandRunContext);

    expect(existsSync(join(testDir, 'contracts/requirements.contract.mjs'))).toBe(true);
    expect(existsSync(join(testDir, 'cdal.config.mjs'))).toBe(true);
    expect(existsSync(join(testDir, '.claude/settings.json'))).toBe(true);
    expect(existsSync(join(testDir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(testDir, '.cursor/rules/cdal.mdc'))).toBe(true);

    const config = readFileSync(join(testDir, 'cdal.config.mjs'), 'utf8');
    expect(config).toContain('typescript-strict');
  });

  it('updates existing package.json scripts without overwriting other scripts', async () => {
    const initialPkg = {
      name: 'sample-project',
      scripts: {
        build: 'next build',
        test: 'vitest',
      },
    };
    writeFileSync(join(testDir, 'package.json'), JSON.stringify(initialPkg, null, 2), 'utf8');

    await initCommand.run?.({
      args: {
        cwd: testDir,
        yes: true,
        preset: 'nextjs',
        runtime: 'claude-code',
      },
      rawArgs: [],
    } as CommandRunContext);

    const updatedPkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf8'));
    expect(updatedPkg.scripts.build).toBe('next build');
    expect(updatedPkg.scripts.test).toBe('vitest');
    expect(updatedPkg.scripts.verify).toBe('cdal verify');
    expect(updatedPkg.scripts.selftest).toBe('cdal selftest');
    expect(updatedPkg.scripts.trace).toBe('cdal trace');
  });

  it('preserves existing cdal.config.mjs and does not overwrite user modifications', async () => {
    const customConfig = '// custom user configuration\nexport default { custom: true };\n';
    writeFileSync(join(testDir, 'cdal.config.mjs'), customConfig, 'utf8');

    await initCommand.run?.({
      args: {
        cwd: testDir,
        yes: true,
        preset: 'typescript-strict',
        runtime: 'claude-code',
      },
      rawArgs: [],
    } as CommandRunContext);

    const readConfig = readFileSync(join(testDir, 'cdal.config.mjs'), 'utf8');
    expect(readConfig).toBe(customConfig);
  });
});

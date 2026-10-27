import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doctorCommand, runDoctorChecks } from '../src/commands/doctor.js';

describe('cdal doctor CLI command', () => {
  let testDir: string;
  type CommandRunContext = Parameters<NonNullable<typeof doctorCommand.run>>[0];

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `cdal-doctor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  // @REQ: CDAL-REQ-DOCTOR
  it('runs doctor checks on current workspace', () => {
    const { checks, healthy } = runDoctorChecks(process.cwd());
    expect(checks.length).toBeGreaterThanOrEqual(3);

    const nodeCheck = checks.find((c) => c.name === 'Node.js Runtime');
    expect(nodeCheck).toBeDefined();
    expect(nodeCheck?.status).toBe('ok');

    const gitCheck = checks.find((c) => c.name === 'Git Binary');
    expect(gitCheck).toBeDefined();
    expect(gitCheck?.status).toBe('ok');

    expect(typeof healthy).toBe('boolean');
  });

  it('detects uninitialized or non-git directory', () => {
    const { checks } = runDoctorChecks(testDir);
    const gitRepoCheck = checks.find((c) => c.name === 'Git Repository');
    expect(gitRepoCheck).toBeDefined();
    expect(gitRepoCheck?.status).toBe('error');
    expect(gitRepoCheck?.recommendation).toContain('git init');
  });

  it('doctor command runs and handles diagnostics', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process exit: ${code}`);
    });

    try {
      await doctorCommand.run?.({
        args: {
          cwd: process.cwd(),
        },
        rawArgs: [],
      } as CommandRunContext);
    } catch {
      // may exit if some check fails in temp/isolated environment
    }
  });

  // @REQ: CDAL-REQ-DOCTOR
  it('accepts hooks only in the Claude Code schema and flags the legacy flat format', () => {
    mkdirSync(join(testDir, '.claude'), { recursive: true });
    const settingsPath = join(testDir, '.claude/settings.json');
    const hookCheck = () =>
      runDoctorChecks(testDir).checks.find((c) => c.name === 'Claude Code Hooks');

    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Edit|Write|NotebookEdit',
              hooks: [{ type: 'command', command: 'npx cdalkit hook guard-paths' }],
            },
          ],
        },
      }),
    );
    expect(hookCheck()?.status).toBe('ok');

    writeFileSync(
      settingsPath,
      JSON.stringify({
        hooks: { PreToolUse: [{ matcher: 'Edit|Write', command: 'npx cdal hook guard-paths' }] },
      }),
    );
    expect(hookCheck()?.status).toBe('warn');
    expect(hookCheck()?.recommendation).toContain('cdalkit sync');
  });
});

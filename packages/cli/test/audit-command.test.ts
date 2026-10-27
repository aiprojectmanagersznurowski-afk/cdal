import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditCommand } from '../src/commands/audit.js';

describe('cdal audit CLI command', () => {
  let testDir: string;
  type CommandRunContext = Parameters<NonNullable<typeof auditCommand.run>>[0];

  beforeEach(() => {
    testDir = join(tmpdir(), `cdal-cli-audit-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });

    // Starter files
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src/main.ts'), 'export const greeting = "hello";\n');
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // @REQ: CDAL-REQ-AUDIT-REPORT
  it('runs audit command and outputs text report', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const context: CommandRunContext = {
      rawArgs: [],
      args: {
        path: testDir,
        html: undefined,
        json: false,
        lang: 'pl',
        failUnder: undefined,
        _: [],
      },
      cmd: auditCommand,
    };

    await auditCommand.run?.(context);

    expect(consoleSpy).toHaveBeenCalled();
    const calls = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(calls).toContain('CDAL Audit');
    expect(calls).toContain('WYNIK:');

    consoleSpy.mockRestore();
  });

  // @REQ: CDAL-REQ-AUDIT-REPORT
  it('outputs machine-readable JSON format when --json is passed', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const context: CommandRunContext = {
      rawArgs: ['--json'],
      args: {
        path: testDir,
        html: undefined,
        json: true,
        lang: 'en',
        failUnder: undefined,
        _: [],
      },
      cmd: auditCommand,
    };

    await auditCommand.run?.(context);

    expect(consoleSpy).toHaveBeenCalled();
    const jsonCall = consoleSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0]);
        return parsed.version === 'audit.v1';
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    if (jsonCall) {
      const parsed = JSON.parse(jsonCall[0]);
      expect(parsed.version).toBe('audit.v1');
      expect(parsed.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(parsed.checks)).toBe(true);
      expect(parsed.checks.length).toBe(8);
    }

    consoleSpy.mockRestore();
  });

  // @REQ: CDAL-REQ-AUDIT-REPORT
  it('saves standalone HTML report when --html is passed', async () => {
    const outHtml = join(testDir, 'report.html');

    const context: CommandRunContext = {
      rawArgs: ['--html', outHtml],
      args: {
        path: testDir,
        html: outHtml,
        json: false,
        lang: 'pl',
        failUnder: undefined,
        _: [],
      },
      cmd: auditCommand,
    };

    await auditCommand.run?.(context);

    expect(existsSync(outHtml)).toBe(true);
    const htmlContent = readFileSync(outHtml, 'utf8');
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('CDAL Audit Report');
    expect(htmlContent).toContain('cal.com/cdal/omowienie-audytu');
  });

  // @REQ: CDAL-REQ-AUDIT-REPORT
  it('exits with code 1 when score is below --fail-under threshold', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const context: CommandRunContext = {
      rawArgs: ['--fail-under', '99'],
      args: {
        path: testDir,
        html: undefined,
        json: false,
        lang: 'pl',
        failUnder: '99',
        _: [],
      },
      cmd: auditCommand,
    };

    await auditCommand.run?.(context);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkAgentConfig,
  checkAgentSelfGrading,
  checkCiGates,
  checkGeneratedDrift,
  checkRequirementTraceability,
  checkSecretLeaks,
  checkSkippedTests,
  checkTypeSilencing,
  crawlWorkspace,
  renderHtmlReport,
  renderTerminalReport,
  runAudit,
} from '../src/index.js';

describe('@cdal/audit quality engine', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `cdal-audit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('crawls workspace and respects gitignore and standard ignored directories', () => {
    // Standard ignored dirs
    mkdirSync(join(testDir, 'node_modules/pkg'), { recursive: true });
    writeFileSync(join(testDir, 'node_modules/pkg/index.js'), 'console.log("ignore me");');

    mkdirSync(join(testDir, 'dist'), { recursive: true });
    writeFileSync(join(testDir, 'dist/bundle.js'), 'console.log("ignore me");');

    mkdirSync(join(testDir, '.next'), { recursive: true });
    writeFileSync(join(testDir, '.next/server.js'), 'console.log("ignore me");');

    // Custom gitignore
    writeFileSync(join(testDir, '.gitignore'), 'ignored-dir/\n*.tmp\n');
    mkdirSync(join(testDir, 'ignored-dir'), { recursive: true });
    writeFileSync(join(testDir, 'ignored-dir/secret.js'), 'const a = 1;');
    writeFileSync(join(testDir, 'temp.tmp'), 'temp');

    // Valid source file
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src/app.ts'), 'export const hello = "world";\n');

    const ws = crawlWorkspace(testDir);
    expect(ws.allFiles.some((f) => f.relativePath.includes('node_modules'))).toBe(false);
    expect(ws.allFiles.some((f) => f.relativePath.includes('dist/'))).toBe(false);
    expect(ws.allFiles.some((f) => f.relativePath.includes('.next/'))).toBe(false);
    expect(ws.allFiles.some((f) => f.relativePath.includes('ignored-dir'))).toBe(false);
    expect(ws.allFiles.some((f) => f.relativePath.endsWith('.tmp'))).toBe(false);
    expect(ws.sourceFiles.some((f) => f.relativePath === 'src/app.ts')).toBe(true);
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('evaluates checkAgentConfig accurately for good vs bad setups', () => {
    // Bad setup: no config
    const wsEmpty = crawlWorkspace(testDir);
    const resBad = checkAgentConfig(wsEmpty);
    expect(resBad.score).toBe(0);
    expect(resBad.passed).toBe(false);

    // Medium setup: CLAUDE.md present but no PreToolUse hooks
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude instructions');
    const wsMedium = crawlWorkspace(testDir);
    const resMed = checkAgentConfig(wsMedium);
    expect(resMed.score).toBeGreaterThan(0);
    expect(resMed.score).toBeLessThan(15);

    // Good setup: .claude/settings.json with PreToolUse
    mkdirSync(join(testDir, '.claude'), { recursive: true });
    writeFileSync(
      join(testDir, '.claude/settings.json'),
      JSON.stringify({ hooks: { PreToolUse: 'cdal hook' } }),
    );
    const wsGood = crawlWorkspace(testDir);
    const resGood = checkAgentConfig(wsGood);
    expect(resGood.score).toBe(15);
    expect(resGood.passed).toBe(true);
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('evaluates checkTypeSilencing density on clean vs polluted codebase', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });

    // Clean code: 100 lines, 0 suppressions
    const cleanLines = Array.from({ length: 100 }, (_, i) => `export const x${i} = ${i};`).join(
      '\n',
    );
    writeFileSync(join(testDir, 'src/clean.ts'), cleanLines);

    const wsClean = crawlWorkspace(testDir);
    const resClean = checkTypeSilencing(wsClean);
    expect(resClean.score).toBe(15);
    expect(resClean.passed).toBe(true);

    // Polluted code: add 10 suppressions in 20 lines (high density)
    const polluted = [
      '// @ts-ignore',
      'const a: any = 1;',
      'const b = a as any;',
      '// @ts-expect-error',
      'const c = b as unknown as string;',
    ].join('\n');
    writeFileSync(join(testDir, 'src/polluted.ts'), polluted);

    const wsPolluted = crawlWorkspace(testDir);
    const resPolluted = checkTypeSilencing(wsPolluted);
    expect(resPolluted.score).toBeLessThan(10);
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('evaluates checkSkippedTests for clean suite, .skip, and blocking .only', () => {
    mkdirSync(join(testDir, 'test'), { recursive: true });

    // Clean test suite
    writeFileSync(
      join(testDir, 'test/clean.test.ts'),
      'it("works", () => { expect(1).toBe(1); });',
    );
    const wsClean = crawlWorkspace(testDir);
    const resClean = checkSkippedTests(wsClean);
    expect(resClean.score).toBe(10);
    expect(resClean.passed).toBe(true);

    // Skipped test
    writeFileSync(join(testDir, 'test/skip.test.ts'), 'it.skip("delayed feature", () => {});');
    const wsSkip = crawlWorkspace(testDir);
    const resSkip = checkSkippedTests(wsSkip);
    expect(resSkip.score).toBe(6);

    // .only (critical failure)
    writeFileSync(join(testDir, 'test/isolated.test.ts'), 'it.only("focus on this", () => {});');
    const wsOnly = crawlWorkspace(testDir);
    const resOnly = checkSkippedTests(wsOnly);
    expect(resOnly.score).toBe(0);
    expect(resOnly.passed).toBe(false);
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('evaluates checkRequirementTraceability for register and @REQ tags', () => {
    mkdirSync(join(testDir, 'test'), { recursive: true });
    mkdirSync(join(testDir, 'contracts'), { recursive: true });

    // Missing everything
    const wsEmpty = crawlWorkspace(testDir);
    expect(checkRequirementTraceability(wsEmpty).score).toBe(0);

    // Tagged tests without formal register
    writeFileSync(
      join(testDir, 'test/feature.test.ts'),
      `// @${'REQ'}: REQ-AUTH-01\nit("authenticates", () => {});`,
    );
    const wsTagsOnly = crawlWorkspace(testDir);
    expect(checkRequirementTraceability(wsTagsOnly).score).toBe(6);

    // Both register and tagged tests
    writeFileSync(
      join(testDir, 'contracts/requirements.contract.mjs'),
      'export default { requirements: [{ id: "REQ-AUTH-01" }] };',
    );
    const wsComplete = crawlWorkspace(testDir);
    const resComplete = checkRequirementTraceability(wsComplete);
    expect(resComplete.score).toBe(10);
    expect(resComplete.passed).toBe(true);
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('evaluates checkCiGates on pull request workflow', () => {
    mkdirSync(join(testDir, '.github/workflows'), { recursive: true });

    // Incomplete CI (no tests)
    writeFileSync(
      join(testDir, '.github/workflows/deploy.yml'),
      'on: [push]\njobs:\n  deploy:\n    steps:\n      - run: echo deploy',
    );
    const wsIncomplete = crawlWorkspace(testDir);
    expect(checkCiGates(wsIncomplete).score).toBeLessThan(10);

    // Complete CI running verify/test on pull_request
    writeFileSync(
      join(testDir, '.github/workflows/ci.yml'),
      `
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  test:
    steps:
      - run: pnpm typecheck
      - run: pnpm test
`,
    );
    const wsComplete = crawlWorkspace(testDir);
    const resComplete = checkCiGates(wsComplete);
    expect(resComplete.score).toBe(15);
    expect(resComplete.passed).toBe(true);
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('evaluates checkSecretLeaks detecting live API keys while ignoring examples', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });

    // Example file should not trigger
    const mockExampleKey = ['sk', 'live', '123456789012345678901234'].join('_');
    writeFileSync(join(testDir, '.env.example'), `STRIPE_SECRET=${mockExampleKey}\n`);
    const wsExample = crawlWorkspace(testDir);
    expect(checkSecretLeaks(wsExample).score).toBe(15);

    // Real leaked key in src/config.ts
    // Use dynamic string construction to prevent secret scanner false positives on this test file
    const liveKeyPrefix = 'sk_' + 'live_';
    writeFileSync(
      join(testDir, 'src/config.ts'),
      `export const KEY = "${liveKeyPrefix}abcdefghijklmnopqrstuvwxyz1234";`,
    );
    const wsLeaked = crawlWorkspace(testDir);
    const resLeaked = checkSecretLeaks(wsLeaked);
    expect(resLeaked.score).toBe(0);
    expect(resLeaked.passed).toBe(false);
  });

  // @REQ: CDAL-REQ-AUDIT-DRIFT
  it('evaluates checkGeneratedDrift for codegen check enforcement', () => {
    mkdirSync(join(testDir, 'src/generated'), { recursive: true });
    writeFileSync(
      join(testDir, 'src/generated/types.ts'),
      '// @generated by cdal - DO NOT EDIT\nexport type Foo = string;\n',
    );

    // Without drift check in package.json
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'my-app' }));
    const wsNoDrift = crawlWorkspace(testDir);
    expect(checkGeneratedDrift(wsNoDrift).score).toBe(2);

    // With drift check in package.json scripts
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'my-app', scripts: { verify: 'cdal codegen --check && pnpm test' } }),
    );
    const wsWithDrift = crawlWorkspace(testDir);
    expect(checkGeneratedDrift(wsWithDrift).score).toBe(5);
    expect(checkGeneratedDrift(wsWithDrift).passed).toBe(true);
  });

  // @REQ: CDAL-REQ-AUDIT-REPORT
  it('generates offline HTML report with UTM Cal.com CTA and zero external dependencies', async () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src/app.ts'), 'export const val = 42;\n');

    const report = await runAudit({ cwd: testDir, lang: 'pl' });
    expect(report.version).toBe('audit.v1');
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);

    const html = renderHtmlReport(report, 'pl');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('utm_source=audit&utm_medium=report');
    expect(html).toContain('cal.com/cdal/omowienie-audytu');

    // Verify zero external assets (no http/https scripts, stylesheets or external web fonts)
    expect(html).not.toMatch(/<script[^>]+src=["']https?:\/\//i);
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:\/\//i);
    expect(html).not.toMatch(/@import\s+url\(["']https?:\/\//i);

    const term = renderTerminalReport(report, 'pl');
    expect(term).toContain('CDAL Audit');
    expect(term).toContain('WYNIK:');
  });

  // @REQ: CDAL-REQ-AUDIT-OFFLINE
  it('benchmark: scans large workspace in well under 20 seconds', () => {
    // Generate 500 files to benchmark crawler speed
    mkdirSync(join(testDir, 'large/src'), { recursive: true });
    for (let i = 0; i < 500; i++) {
      writeFileSync(
        join(testDir, `large/src/file_${i}.ts`),
        `export function fn${i}() { return ${i}; }\n`.repeat(10),
      );
    }

    const t0 = Date.now();
    const ws = crawlWorkspace(testDir);
    const checkRes = checkTypeSilencing(ws);
    const elapsed = Date.now() - t0;

    expect(ws.sourceFiles.length).toBe(500);
    expect(checkRes.passed).toBe(true);
    // Should be blazing fast (< 2000 ms, plan requires < 20s for 200k LOC)
    expect(elapsed).toBeLessThan(2000);
  });
});

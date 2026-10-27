import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ContractRegistry,
  type Finding,
  createFindingsReport,
  defineKind,
  formatFindingsText,
  runValidation,
} from '../src/index.js';

describe('Contract Validation Engine (CDK-E1-VALIDATE)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdal-validate-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // @REQ: CDAL-REQ-VALIDATE
  it('generates valid findings.v1 report on empty findings', () => {
    const report = createFindingsReport([]);
    expect(report.version).toBe('findings.v1');
    expect(report.valid).toBe(true);
    expect(report.stats).toEqual({ errors: 0, warnings: 0, total: 0 });
    expect(report.findings).toEqual([]);
  });

  it('marks report invalid when error findings exist', () => {
    const findings: Finding[] = [
      { ruleId: 'ERR-1', severity: 'error', message: 'Fatal invariant broken' },
    ];
    const report = createFindingsReport(findings, false);
    expect(report.valid).toBe(false);
    expect(report.stats.errors).toBe(1);
    expect(report.stats.warnings).toBe(0);
  });

  it('handles warnings: passes in normal mode, fails in strict mode', () => {
    const findings: Finding[] = [
      { ruleId: 'WARN-1', severity: 'warn', message: 'Proposed or deprecated feature' },
    ];

    const normalReport = createFindingsReport(findings, false);
    expect(normalReport.valid).toBe(true);
    expect(normalReport.stats.warnings).toBe(1);

    const strictReport = createFindingsReport(findings, true);
    expect(strictReport.valid).toBe(false);
    expect(strictReport.stats.warnings).toBe(1);
  });

  it('formats text report with clear status icons and summary', () => {
    const cleanReport = createFindingsReport([]);
    const cleanText = formatFindingsText(cleanReport);
    expect(cleanText).toContain('All contract invariants passed without findings');

    const errorReport = createFindingsReport([
      { ruleId: 'R-ERR', severity: 'error', message: 'Bad ID', file: 'test.contract.mjs' },
      { ruleId: 'R-WARN', severity: 'warn', message: 'Deprecated', file: 'test.contract.mjs' },
    ]);
    const errorText = formatFindingsText(errorReport, true);
    expect(errorText).toContain('❌ (R-ERR) [test.contract.mjs]: Bad ID');
    expect(errorText).toContain('⚠️  (R-WARN) [test.contract.mjs]: Deprecated');
    expect(errorText).toContain('Errors: 1');
    expect(errorText).toContain('Warnings: 1');
    expect(errorText).toContain('Result: FAILED (strict mode)');
  });

  it('runs end-to-end contract validation with registry', async () => {
    const contractsDir = path.join(tmpDir, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    fs.writeFileSync(
      path.join(contractsDir, 'sample.contract.mjs'),
      `export const ITEMS = ['item-1'];`,
      'utf8',
    );

    const sampleKind = defineKind({
      id: 'sample',
      files: ['sample.contract.mjs'],
      load: (mod) => ({ items: mod.ITEMS as string[] }),
      rules: [
        {
          id: 'SAMPLE-RULE',
          severity: 'error',
          check: (data) =>
            data.items.length === 1
              ? []
              : [{ ruleId: 'SAMPLE-RULE', severity: 'error', message: 'Must have 1 item' }],
        },
      ],
      mutations: [],
    });

    const registry = new ContractRegistry();
    registry.register(sampleKind);

    const report = await runValidation({
      contractsDir: 'contracts',
      cwd: tmpDir,
      registry,
    });

    expect(report.version).toBe('findings.v1');
    expect(report.valid).toBe(true);
    expect(report.stats.errors).toBe(0);
  });
});

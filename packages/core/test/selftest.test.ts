import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ContractKind, defineKind, resolveConfig, runSelftest } from '../src/index.js';

const TEST_DIR = path.resolve(process.cwd(), '.tmp-selftest-test');

describe('Selftest Mutation & Probe Runner (@cdal/core selftest)', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // @REQ: CDAL-REQ-SELFTEST
  it('runs content probes against active presets', async () => {
    const config = resolveConfig({
      contractsDir: 'contracts',
      presets: ['typescript-strict', 'nextjs'],
    });

    const report = await runSelftest({
      cwd: TEST_DIR,
      config,
      contractsDir: path.join(TEST_DIR, 'contracts'),
    });

    expect(report.schemaVersion).toBe('selftest.v1');
    expect(report.probesTotal).toBeGreaterThan(0);
    expect(report.probesPassed).toBe(report.probesTotal);
    expect(report.failures).toHaveLength(0);
    expect(report.ok).toBe(true);
  });

  it('flags fatal failure when a rule in a kind has no mutation probe', async () => {
    const brokenKind: ContractKind<unknown> = defineKind({
      id: 'mock-kind',
      files: ['mock.contract.mjs'],
      load: () => ({}),
      rules: [
        {
          id: 'RULE-WITH-PROBE',
          severity: 'error',
          check: () => [],
        },
        {
          id: 'RULE-WITHOUT-PROBE',
          severity: 'error',
          check: () => [],
        },
      ],
      mutations: [
        {
          rule: 'RULE-WITH-PROBE',
          file: 'mock.contract.mjs',
          find: 'foo',
          replace: 'bar',
        },
      ],
    });

    const config = resolveConfig({
      contractsDir: 'contracts',
      kinds: [brokenKind],
    });

    const report = await runSelftest({
      cwd: TEST_DIR,
      config,
      contractsDir: path.join(TEST_DIR, 'contracts'),
    });

    expect(report.ok).toBe(false);
    expect(
      report.failures.some((f) =>
        f.includes('Rule "RULE-WITHOUT-PROBE" in kind "mock-kind" has no mutation probe'),
      ),
    ).toBe(true);
  });

  it('mutates contracts in temp copies and verifies that target rule fires', async () => {
    const contractsDir = path.join(TEST_DIR, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    const contractFile = path.join(contractsDir, 'sample.contract.mjs');
    fs.writeFileSync(
      contractFile,
      `export const SAMPLE = {
  status: 'ACTIVE',
  value: 42,
};
`,
      'utf8',
    );

    const testKind: ContractKind<{ status: string; value: number }> = defineKind({
      id: 'sample-kind',
      files: ['sample.contract.mjs'],
      load: (mod) => {
        const raw = (mod.SAMPLE || mod.default?.SAMPLE) as { status: string; value: number };
        return raw;
      },
      rules: [
        {
          id: 'SAMPLE-ACTIVE-STATUS',
          severity: 'error',
          check: (data) => {
            if (data.status !== 'ACTIVE') {
              return [
                {
                  rule: 'SAMPLE-ACTIVE-STATUS',
                  file: 'sample.contract.mjs',
                  severity: 'error',
                  msg: 'Status must be ACTIVE',
                },
              ];
            }
            return [];
          },
        },
      ],
      mutations: [
        {
          rule: 'SAMPLE-ACTIVE-STATUS',
          file: 'sample.contract.mjs',
          find: "status: 'ACTIVE'",
          replace: "status: 'INACTIVE'",
        },
      ],
    });

    const config = resolveConfig({
      contractsDir: 'contracts',
      kinds: [testKind],
    });

    const report = await runSelftest({
      cwd: TEST_DIR,
      config,
      contractsDir,
    });

    expect(report.mutationsTotal).toBe(1);
    expect(report.mutationsPassed).toBe(1);
    expect(report.mutationResults[0]?.passed).toBe(true);
    expect(report.mutationResults[0]?.rule).toBe('SAMPLE-ACTIVE-STATUS');
    expect(report.ok).toBe(true);

    // Verify that the original contract file was NOT touched by the mutation
    const originalContent = fs.readFileSync(contractFile, 'utf8');
    expect(originalContent).toContain("status: 'ACTIVE'");
  });

  it('fails selftest when mutation does not trigger the expected rule', async () => {
    const contractsDir = path.join(TEST_DIR, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    const contractFile = path.join(contractsDir, 'sample.contract.mjs');
    fs.writeFileSync(
      contractFile,
      `export const SAMPLE = {
  status: 'ACTIVE',
};
`,
      'utf8',
    );

    const ineffectiveKind: ContractKind<{ status: string }> = defineKind({
      id: 'ineffective-kind',
      files: ['sample.contract.mjs'],
      load: () => ({ status: 'ACTIVE' }),
      rules: [
        {
          id: 'SAMPLE-INEFFECTIVE-RULE',
          severity: 'error',
          check: () => [], // Rule never triggers!
        },
      ],
      mutations: [
        {
          rule: 'SAMPLE-INEFFECTIVE-RULE',
          file: 'sample.contract.mjs',
          find: "status: 'ACTIVE'",
          replace: "status: 'INACTIVE'",
        },
      ],
    });

    const config = resolveConfig({
      contractsDir: 'contracts',
      kinds: [ineffectiveKind],
    });

    const report = await runSelftest({
      cwd: TEST_DIR,
      config,
      contractsDir,
    });

    expect(report.ok).toBe(false);
    expect(report.mutationsPassed).toBe(0);
    expect(report.mutationResults[0]?.passed).toBe(false);
    expect(
      report.failures.some((f) =>
        f.includes('Mutation did not trigger target rule "SAMPLE-INEFFECTIVE-RULE"'),
      ),
    ).toBe(true);
  });
});

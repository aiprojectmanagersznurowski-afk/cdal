import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type TraceRequirement,
  formatTraceMarkdown,
  formatTraceText,
  parseTestResults,
  scanTrace,
} from '../src/index.js';

const TEST_DIR = path.resolve(process.cwd(), '.tmp-trace-test');

describe('Requirements Trace Matrix (@cdal/core trace)', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  const sampleRequirements: TraceRequirement[] = [
    {
      id: 'REQ-AUTH-001',
      domain: 'auth',
      risk: 'HIGH',
      status: 'DONE',
      statement: 'System must authenticate users via JWT token.',
    },
    {
      id: 'REQ-AUTH-002',
      domain: 'auth',
      risk: 'MEDIUM',
      status: 'IMPLEMENTING',
      statement: 'System must expire tokens after 1 hour.',
    },
    {
      id: 'REQ-BILLING-001',
      domain: 'billing',
      risk: 'HIGH',
      status: 'TODO',
      statement: 'System must charge invoices accurately.',
    },
    {
      id: 'REQ-NOTIF-001',
      domain: 'notifications',
      risk: 'LOW',
      status: 'DONE',
      statement: 'System sends email notification on login.',
    },
  ];

  // @REQ: CDAL-REQ-TRACE
  it('scans test files and maps @REQ tags to requirements', () => {
    const testsDir = path.join(TEST_DIR, 'tests');
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(
      path.join(testsDir, 'auth.test.ts'),
      `// @${'REQ'}: REQ-AUTH-001
test('user logs in with JWT', () => {
  expect(true).toBe(true);
});

// @${'REQ'}: REQ-AUTH-002, REQ-NOTIF-001
test('tokens expire and notification is queued', () => {
  expect(true).toBe(true);
});
`,
      'utf8',
    );

    const report = scanTrace(sampleRequirements, { cwd: TEST_DIR, searchRoots: ['tests'] });

    expect(report.schemaVersion).toBe('trace.v1');
    expect(report.total).toBe(4);
    expect(report.covered).toBe(3); // REQ-AUTH-001, REQ-AUTH-002, REQ-NOTIF-001
    expect(report.coveragePercent).toBe(75);

    const req1 = report.rows.find((r) => r.id === 'REQ-AUTH-001');
    expect(req1?.tests.length).toBe(1);
    expect(req1?.tests[0]?.file).toBe('tests/auth.test.ts');
    expect(req1?.verdict).toBe('COVERED (no results)');

    const req2 = report.rows.find((r) => r.id === 'REQ-AUTH-002');
    expect(req2?.tests.length).toBe(1);

    const reqBilling = report.rows.find((r) => r.id === 'REQ-BILLING-001');
    expect(reqBilling?.tests.length).toBe(0);
    expect(reqBilling?.verdict).toBe('NO TEST');
  });

  it('identifies unknown @REQ tags pointing to non-existent IDs', () => {
    const testsDir = path.join(TEST_DIR, 'tests');
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(
      path.join(testsDir, 'bad-tag.test.ts'),
      `// @${'REQ'}: REQ-INVENTED-999
test('invented requirement tag', () => {});
`,
      'utf8',
    );

    const report = scanTrace(sampleRequirements, { cwd: TEST_DIR, searchRoots: ['tests'] });

    expect(report.unknownTags.length).toBe(1);
    expect(report.unknownTags[0]?.id).toBe('REQ-INVENTED-999');
    expect(report.unknownTags[0]?.file).toBe('tests/bad-tag.test.ts');
    expect(report.ok).toBe(false);
  });

  it('detects violations when IMPLEMENTING or DONE requirements have zero tests', () => {
    // No tests created at all
    const report = scanTrace(sampleRequirements, { cwd: TEST_DIR, searchRoots: ['tests'] });

    expect(report.violations.length).toBe(3); // REQ-AUTH-001 (DONE), REQ-AUTH-002 (IMPLEMENTING), REQ-NOTIF-001 (DONE)
    expect(report.ok).toBe(false);

    // REQ-AUTH-001 and REQ-BILLING-001 are HIGH risk and lack test coverage
    expect(report.highRiskUncovered.length).toBe(2);
    expect(report.highRiskUncovered.map((r) => r.id)).toEqual(['REQ-AUTH-001', 'REQ-BILLING-001']);
  });

  it('parses test results json and identifies failing tests', () => {
    const testsDir = path.join(TEST_DIR, 'tests');
    fs.mkdirSync(testsDir, { recursive: true });

    const testFile = path.join(testsDir, 'auth.test.ts');
    fs.writeFileSync(
      testFile,
      `// @${'REQ'}: REQ-AUTH-001
test('user logs in with JWT', () => {});
`,
      'utf8',
    );

    const resultsFile = path.join(TEST_DIR, 'test-results.json');
    fs.writeFileSync(
      resultsFile,
      JSON.stringify({
        numFailedTests: 1,
        testResults: [
          {
            file: 'tests/auth.test.ts',
            status: 'failed',
          },
        ],
      }),
      'utf8',
    );

    const failingFiles = parseTestResults(resultsFile, TEST_DIR);
    expect(failingFiles.has('tests/auth.test.ts')).toBe(true);

    const report = scanTrace(sampleRequirements, {
      cwd: TEST_DIR,
      searchRoots: ['tests'],
      resultsFile: 'test-results.json',
    });

    const req1 = report.rows.find((r) => r.id === 'REQ-AUTH-001');
    expect(req1?.failing.length).toBe(1);
    expect(req1?.verdict).toBe('TEST FAILING');
    expect(report.violations.some((v) => v.id === 'REQ-AUTH-001')).toBe(true);
  });

  it('formats markdown table and console text cleanly', () => {
    const report = scanTrace(sampleRequirements, { cwd: TEST_DIR, searchRoots: ['tests'] });

    const md = formatTraceMarkdown(report);
    expect(md).toContain('| Requirement | Domain | Risk | Status | Tests | Verdict |');
    expect(md).toContain('`REQ-AUTH-001`');
    expect(md).toContain('**Coverage**:');

    const text = formatTraceText(report);
    expect(text).toContain('cdal trace — requirement to test traceability matrix');
    expect(text).toContain('GATE VIOLATIONS:');
  });
});

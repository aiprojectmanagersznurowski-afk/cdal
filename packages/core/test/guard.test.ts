import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BUILTIN_PRESETS,
  type ResolvedCdalConfig,
  checkBash,
  checkWrite,
  closeContractWindow,
  getContractWindowStatus,
  isContractWindowOpen,
  isProtectedPath,
  isTestPath,
  openContractWindow,
  resolveConfig,
} from '../src/index.js';

const TEST_DIR = path.resolve(process.cwd(), '.tmp-guard-test');

describe('Contract Window Management', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    closeContractWindow(TEST_DIR);
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // @REQ: CDAL-REQ-WINDOW
  it('reports closed when no window file exists', () => {
    expect(isContractWindowOpen(TEST_DIR)).toBe(false);
    expect(getContractWindowStatus(TEST_DIR)).toEqual({ open: false });
  });

  it('opens and closes contract window correctly', () => {
    const opened = openContractWindow('WO-001', { cwd: TEST_DIR, durationMinutes: 30 });
    expect(opened.open).toBe(true);
    expect(opened.ticket).toBe('WO-001');
    expect(isContractWindowOpen(TEST_DIR)).toBe(true);

    const status = getContractWindowStatus(TEST_DIR);
    expect(status.open).toBe(true);
    expect(status.ticket).toBe('WO-001');

    closeContractWindow(TEST_DIR);
    expect(isContractWindowOpen(TEST_DIR)).toBe(false);
    expect(getContractWindowStatus(TEST_DIR).open).toBe(false);
  });

  it('reports closed if window duration has expired', () => {
    const opened = openContractWindow('WO-EXPIRED', { cwd: TEST_DIR, durationMinutes: -5 });
    expect(opened.open).toBe(true);
    expect(isContractWindowOpen(TEST_DIR)).toBe(false);
    expect(getContractWindowStatus(TEST_DIR).open).toBe(false);
  });
});

describe('Guard Helper Utilities', () => {
  it('detects test paths correctly', () => {
    expect(isTestPath('src/utils.test.ts')).toBe(true);
    expect(isTestPath('src/utils.spec.tsx')).toBe(true);
    expect(isTestPath('tests/unit.ts')).toBe(true);
    expect(isTestPath('packages/core/__tests__/core.ts')).toBe(true);
    expect(isTestPath('e2e/login.spec.ts')).toBe(true);

    expect(isTestPath('src/utils.ts')).toBe(false);
    expect(isTestPath('app/page.tsx')).toBe(false);
    expect(isTestPath('docs/testing-guide.md')).toBe(false);
  });

  it('detects protected paths correctly', () => {
    const protectedPatterns = ['contracts/', 'src/generated/contracts/', 'prisma/schema.prisma'];
    expect(isProtectedPath('contracts/req.contract.mjs', protectedPatterns)).toBe(true);
    expect(isProtectedPath('src/generated/contracts/types.ts', protectedPatterns)).toBe(true);
    expect(isProtectedPath('prisma/schema.prisma', protectedPatterns)).toBe(true);

    expect(isProtectedPath('src/service.ts', protectedPatterns)).toBe(false);
    expect(isProtectedPath('tests/test.ts', protectedPatterns)).toBe(false);
  });
});

describe('Role Scope & Test Isolation Enforcement', () => {
  const baseConfig: ResolvedCdalConfig = resolveConfig({
    contractsDir: 'contracts',
    protectedPaths: ['contracts/', 'src/generated/contracts/'],
    roles: {
      'spec-analyst': { write: ['docs/workorders/', '.cdal/state/'] },
      'test-author': { write: ['tests/', 'src/**/*.test.ts', '.cdal/state/'] },
      implementer: { write: ['src/', 'app/', '.cdal/state/'], denyTests: true },
      reviewer: { write: ['.cdal/memory/'] },
    },
  });

  // @REQ: CDAL-REQ-GUARD-PATH
  it('physically blocks implementer from editing test files (denyTests: true)', () => {
    const testFile = 'src/features/billing.test.ts';
    const result = checkWrite(testFile, 'test("billing", () => {})', {
      role: 'implementer',
      config: baseConfig,
    });
    expect(result.blocked).toBe(true);
    expect(result.rule).toBe('role-test-write');
    expect(result.reason).toContain('physically prohibited from writing or editing test files');
  });

  it('allows implementer to write production code within write scopes', () => {
    const prodFile = 'src/features/billing.ts';
    const result = checkWrite(prodFile, 'export function charge() {}', {
      role: 'implementer',
      config: baseConfig,
    });
    expect(result.blocked).toBe(false);
  });

  it('blocks test-author from writing production code', () => {
    const prodFile = 'src/features/billing.ts';
    const result = checkWrite(prodFile, 'export function charge() {}', {
      role: 'test-author',
      config: baseConfig,
    });
    expect(result.blocked).toBe(true);
    expect(result.rule).toBe('role-impl-write');
  });

  it('allows test-author to write test files', () => {
    const testFile = 'src/features/billing.test.ts';
    const result = checkWrite(testFile, 'describe("billing", () => {})', {
      role: 'test-author',
      config: baseConfig,
    });
    expect(result.blocked).toBe(false);
  });

  it('blocks roles writing outside their declared scopes', () => {
    const result = checkWrite('src/index.ts', 'console.log("hi")', {
      role: 'reviewer',
      config: baseConfig,
    });
    expect(result.blocked).toBe(true);
    expect(result.rule).toBe('role-scope');
    expect(result.reason).toContain('does not have write scope');
  });
});

describe('Protected Path and Contract Window Guard', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    closeContractWindow(TEST_DIR);
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  const config: ResolvedCdalConfig = resolveConfig({
    contractsDir: 'contracts',
    protectedPaths: ['contracts/', 'src/generated/contracts/'],
    roles: {
      'contract-steward': { write: ['contracts/', 'src/generated/contracts/'] },
      implementer: { write: ['src/'], denyTests: true },
    },
  });

  it('blocks non-contract-steward from writing protected paths even if window open', () => {
    openContractWindow('TICKET-1', { cwd: TEST_DIR });
    const result = checkWrite('contracts/req.contract.mjs', '// content', {
      role: 'implementer',
      config,
      cwd: TEST_DIR,
    });
    expect(result.blocked).toBe(true);
    expect(result.rule).toBe('contract-path');
    expect(result.reason).toContain('contract-steward');
  });

  it('blocks contract-steward when contract window is closed', () => {
    closeContractWindow(TEST_DIR);
    const result = checkWrite('contracts/req.contract.mjs', '// content', {
      role: 'contract-steward',
      config,
      cwd: TEST_DIR,
    });
    expect(result.blocked).toBe(true);
    expect(result.rule).toBe('contract-window');
  });

  it('allows contract-steward when contract window is open', () => {
    openContractWindow('TICKET-2', { cwd: TEST_DIR });
    const result = checkWrite('contracts/req.contract.mjs', '// content', {
      role: 'contract-steward',
      config,
      cwd: TEST_DIR,
    });
    expect(result.blocked).toBe(false);
  });
});

describe('Tabular Forbidden Content Rules (Preset Checks)', () => {
  const tsStrictConfig: ResolvedCdalConfig = resolveConfig({
    contractsDir: 'contracts',
    presets: ['typescript-strict'],
  });

  const nextjsConfig: ResolvedCdalConfig = resolveConfig({
    contractsDir: 'contracts',
    presets: ['nextjs'],
  });

  const nodeServiceConfig: ResolvedCdalConfig = resolveConfig({
    contractsDir: 'contracts',
    presets: ['node-service'],
  });

  // @REQ: CDAL-REQ-GUARD-FORBIDDEN
  // @REQ: CDAL-REQ-GATE-EVASION
  describe('typescript-strict preset', () => {
    it.each([
      {
        desc: 'blocks @ts-ignore',
        file: 'src/file.ts',
        content: '// @ts-ignore\nconst bad = 1;',
        expectedBlocked: true,
        rule: 'ts-ignore',
      },
      {
        desc: 'blocks @ts-expect-error',
        file: 'src/file.tsx',
        content: '// @ts-expect-error\nconst bad = 1;',
        expectedBlocked: true,
        rule: 'ts-ignore',
      },
      {
        desc: 'allows standard comment',
        file: 'src/file.ts',
        content: '// Note: standard comment\nconst good = 1;',
        expectedBlocked: false,
      },
      {
        desc: 'blocks as any',
        file: 'src/file.ts',
        content: 'const x = obj as any;',
        expectedBlocked: true,
        rule: 'as-any',
      },
      {
        desc: 'allows typed casting',
        file: 'src/file.ts',
        content: 'const x = obj as string;',
        expectedBlocked: false,
      },
      {
        desc: 'blocks skipped test',
        file: 'src/feature.test.ts',
        content: 'it.skip("does something", () => {});',
        expectedBlocked: true,
        rule: 'skipped-test',
      },
      {
        desc: 'blocks isolated test (.only)',
        file: 'src/feature.test.ts',
        content: 'describe.only("suite", () => {});',
        expectedBlocked: true,
        rule: 'skipped-test',
      },
      {
        desc: 'allows normal test execution',
        file: 'src/feature.test.ts',
        content: 'it("runs properly", () => { expect(1).toBe(1); });',
        expectedBlocked: false,
      },
      {
        desc: 'blocks split identifier evasion in prod code (array join empty)',
        file: 'src/feature.ts',
        content: "const tbl = ['kli', 'enci'].join('');",
        expectedBlocked: true,
        rule: 'gate-evasion-split-identifier',
      },
      {
        desc: 'blocks split identifier evasion in prod code (string concatenation)',
        file: 'src/feature.ts',
        content: "const evil = 'user' + 'Role';",
        expectedBlocked: true,
        rule: 'gate-evasion-split-identifier',
      },
      {
        desc: 'allows array join with non-empty separator in prod code',
        file: 'src/feature.ts',
        content: "const names = ['Alice', 'Bob'].join(', ');",
        expectedBlocked: false,
      },
      {
        desc: 'allows split identifier in test files due to allowIn exception',
        file: 'tests/scanner.test.ts',
        content: "const evil = ['an', 'y'].join('');",
        expectedBlocked: false,
      },
      {
        desc: 'blocks double-casting prisma via unknown',
        file: 'src/db.ts',
        content: 'const client = prisma as unknown as CustomClient;',
        expectedBlocked: true,
        rule: 'gate-evasion-prisma-recast',
      },
      {
        desc: 'blocks casting to PrismaDelegate via unknown',
        file: 'src/db.ts',
        content: 'const delegate = db as unknown as PrismaDelegate;',
        expectedBlocked: true,
        rule: 'gate-evasion-prisma-recast',
      },
      {
        desc: 'allows non-prisma casting via unknown',
        file: 'src/utils.ts',
        content: 'const val = raw as unknown as string;',
        expectedBlocked: false,
      },
    ])('$desc', ({ file, content, expectedBlocked, rule }) => {
      const result = checkWrite(file, content, { config: tsStrictConfig });
      expect(result.blocked).toBe(expectedBlocked);
      if (rule) {
        expect(result.rule).toBe(rule);
      }
    });
  });

  describe('nextjs preset', () => {
    it.each([
      {
        desc: 'blocks Supabase service role key in client component',
        file: 'app/dashboard/page.tsx',
        content: 'const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;',
        expectedBlocked: true,
        rule: 'nextjs-service-key-client',
      },
      {
        desc: 'blocks service_role string in client hook',
        file: 'hooks/use-auth.tsx',
        content: "const role = 'service_role';",
        expectedBlocked: true,
        rule: 'nextjs-service-key-client',
      },
      {
        desc: 'allows Supabase anon key in client component',
        file: 'app/dashboard/page.tsx',
        content: 'const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;',
        expectedBlocked: false,
      },
      {
        desc: 'allows service role key in server backend files',
        file: 'lib/server/admin.ts',
        content: 'const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;',
        expectedBlocked: false,
      },
      {
        desc: 'blocks hardcoded hex color in app component',
        file: 'apps/web/card.tsx',
        content: 'const style = { color: "#ff5500" };',
        expectedBlocked: true,
        rule: 'nextjs-hardcoded-hex',
      },
      {
        desc: 'allows hardcoded hex color in globals.css (allowIn)',
        file: 'apps/web/globals.css',
        content: ':root { --primary: #ff5500; }',
        expectedBlocked: false,
      },
      {
        desc: 'allows design token class in component',
        file: 'apps/web/card.tsx',
        content: '<div className="bg-primary text-foreground" />',
        expectedBlocked: false,
      },
    ])('$desc', ({ file, content, expectedBlocked, rule }) => {
      const result = checkWrite(file, content, { config: nextjsConfig });
      expect(result.blocked).toBe(expectedBlocked);
      if (rule) {
        expect(result.rule).toBe(rule);
      }
    });
  });

  describe('node-service preset', () => {
    it.each([
      {
        desc: 'blocks synchronous readFileSync inside handler',
        file: 'src/handlers/user.ts',
        content: "const data = fs.readFileSync('foo.txt');",
        expectedBlocked: true,
        rule: 'node-sync-fs-in-handler',
      },
      {
        desc: 'blocks synchronous writeFileSync inside api route',
        file: 'app/api/upload.ts',
        content: "fs.writeFileSync('out.bin', data);",
        expectedBlocked: true,
        rule: 'node-sync-fs-in-handler',
      },
      {
        desc: 'allows async fs.promises in handlers',
        file: 'src/handlers/user.ts',
        content: "const data = await fs.promises.readFile('foo.txt');",
        expectedBlocked: false,
      },
      {
        desc: 'allows synchronous fs outside of handlers (e.g. scripts)',
        file: 'scripts/generate.ts',
        content: "const data = fs.readFileSync('foo.txt');",
        expectedBlocked: false,
      },
    ])('$desc', ({ file, content, expectedBlocked, rule }) => {
      const result = checkWrite(file, content, { config: nodeServiceConfig });
      expect(result.blocked).toBe(expectedBlocked);
      if (rule) {
        expect(result.rule).toBe(rule);
      }
    });
  });
});

describe('Tabular Bash Guardrails (safe-defaults)', () => {
  const config = resolveConfig({
    contractsDir: 'contracts',
    bash: { preset: 'safe-defaults' },
  });

  // @REQ: CDAL-REQ-GUARD-BASH
  it.each([
    { cmd: 'rm -rf /', expectedBlocked: true, desc: 'rm -rf / root' },
    { cmd: 'rm -rf ~', expectedBlocked: true, desc: 'rm -rf ~ home' },
    { cmd: 'rm -rf $HOME', expectedBlocked: true, desc: 'rm -rf $HOME' },
    { cmd: 'rm -rf *', expectedBlocked: true, desc: 'rm -rf * global' },
    { cmd: 'git push -f origin main', expectedBlocked: true, desc: 'git push -f' },
    { cmd: 'git push --force origin feat', expectedBlocked: true, desc: 'git push --force' },
    {
      cmd: 'git push --force-with-lease origin feat',
      expectedBlocked: false,
      desc: 'git push --force-with-lease',
    },
    { cmd: 'git checkout main', expectedBlocked: true, desc: 'git checkout main' },
    { cmd: 'git switch main', expectedBlocked: true, desc: 'git switch main' },
    { cmd: 'git checkout -b feat/my-task', expectedBlocked: false, desc: 'git checkout branch' },
    { cmd: 'DROP TABLE users;', expectedBlocked: true, desc: 'DROP TABLE' },
    { cmd: 'DROP DATABASE prod;', expectedBlocked: true, desc: 'DROP DATABASE' },
    { cmd: 'npm publish', expectedBlocked: true, desc: 'npm publish' },
    { cmd: 'pnpm publish', expectedBlocked: true, desc: 'pnpm publish' },
    { cmd: 'vercel deploy --prod', expectedBlocked: true, desc: 'vercel deploy --prod' },
    { cmd: 'pnpm test', expectedBlocked: false, desc: 'pnpm test' },
    { cmd: 'git status', expectedBlocked: false, desc: 'git status' },
  ])('$desc: "$cmd"', ({ cmd, expectedBlocked }) => {
    const result = checkBash(cmd, { config });
    expect(result.blocked).toBe(expectedBlocked);
    if (expectedBlocked) {
      expect(result.rule).toBe('bash');
    }
  });
});

import type { ContentProbe } from './types.js';

const PROD_FILE = 'src/app/probe.ts';
const TEST_FILE = 'tests/probe.test.ts';

export const BUILTIN_CONTENT_PROBES: ContentProbe[] = [
  // ── ts-ignore ──
  {
    rule: 'ts-ignore',
    file: PROD_FILE,
    fires: true,
    content: '// @ts-ignore\nconst bad = 1;',
    desc: '@ts-ignore in production code',
  },
  {
    rule: 'ts-ignore',
    file: PROD_FILE,
    fires: true,
    content: '// @ts-expect-error\nconst bad = 2;',
    desc: '@ts-expect-error in production code',
  },
  {
    rule: 'ts-ignore',
    file: PROD_FILE,
    fires: false,
    content: '// Note: standard comment\nconst good = 1;',
    desc: 'NEGATYWNA: standard comment should not trigger ts-ignore',
  },

  // ── as-any ──
  {
    rule: 'as-any',
    file: PROD_FILE,
    fires: true,
    content: 'const x = val as any;',
    desc: 'casting with "as any"',
  },
  {
    rule: 'as-any',
    file: PROD_FILE,
    fires: false,
    content: 'const x = val as string;',
    desc: 'NEGATYWNA: safe typed casting "as string"',
  },

  // ── skipped-test ──
  {
    rule: 'skipped-test',
    file: TEST_FILE,
    fires: true,
    content: 'it.skip("test", () => {});',
    desc: 'muted test with it.skip',
  },
  {
    rule: 'skipped-test',
    file: TEST_FILE,
    fires: true,
    content: 'describe.only("suite", () => {});',
    desc: 'isolated test suite with describe.only',
  },
  {
    rule: 'skipped-test',
    file: TEST_FILE,
    fires: false,
    content: 'it("test runs cleanly", () => { expect(1).toBe(1); });',
    desc: 'NEGATYWNA: standard test execution without .skip or .only',
  },

  // ── gate-evasion-split-identifier ──
  {
    rule: 'gate-evasion-split-identifier',
    file: PROD_FILE,
    fires: true,
    content: "const tbl = ['kli', 'enci'].join('');",
    desc: 'split identifier joined with empty separator (join(""))',
  },
  {
    rule: 'gate-evasion-split-identifier',
    file: PROD_FILE,
    fires: true,
    content: "const evil = 'user' + 'Role';",
    desc: 'split identifier via literal string concatenation without spaces',
  },
  {
    rule: 'gate-evasion-split-identifier',
    file: PROD_FILE,
    fires: false,
    content: "const label = ['Jan', 'Kowalski'].join(', ');\nconst msg = 'Witaj, ' + name;",
    desc: 'NEGATYWNA: join with separator or concatenation with variable is legal human text',
  },
  {
    rule: 'gate-evasion-split-identifier',
    file: TEST_FILE,
    fires: false,
    content: "const UNSAFE = ['an', 'y'].join('');",
    desc: 'NEGATYWNA: test file creating forbidden token to assert against validator (allowIn test)',
  },

  // ── gate-evasion-prisma-recast ──
  {
    rule: 'gate-evasion-prisma-recast',
    file: PROD_FILE,
    fires: true,
    content: 'const db = prisma as unknown as SomeDynamicType;',
    desc: 'prisma client double recast via unknown',
  },
  {
    rule: 'gate-evasion-prisma-recast',
    file: PROD_FILE,
    fires: true,
    content: 'const d = client as unknown as PrismaDelegate;',
    desc: 'recast to PrismaDelegate via unknown',
  },
  {
    rule: 'gate-evasion-prisma-recast',
    file: TEST_FILE,
    fires: false,
    content:
      'const missing = undefined as unknown as string;\nconst n = badWeekday as unknown as number;',
    desc: 'NEGATYWNA: legitimate test mock casting (bad input) should not trigger prisma rule',
  },

  // ── nextjs-service-key-client ──
  {
    rule: 'nextjs-service-key-client',
    file: 'app/dashboard/page.tsx',
    fires: true,
    content: 'const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;',
    desc: 'Supabase service role key in client component',
  },
  {
    rule: 'nextjs-service-key-client',
    file: 'app/dashboard/page.tsx',
    fires: false,
    content: 'const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;',
    desc: 'NEGATYWNA: public anon key allowed in client component',
  },

  // ── nextjs-hardcoded-hex ──
  {
    rule: 'nextjs-hardcoded-hex',
    file: 'apps/web/page.tsx',
    fires: true,
    content: 'const color = "#ff0088";',
    desc: 'hardcoded hex color in app component',
  },
  {
    rule: 'nextjs-hardcoded-hex',
    file: 'apps/web/globals.css',
    fires: false,
    content: ':root { --primary: #ff0088; }',
    desc: 'NEGATYWNA: hex color allowed in globals.css theme file',
  },

  // ── node-sync-fs-in-handler ──
  {
    rule: 'node-sync-fs-in-handler',
    file: 'src/handlers/user.ts',
    fires: true,
    content: "const data = fs.readFileSync('foo.txt');",
    desc: 'synchronous readFileSync inside request handler',
  },
  {
    rule: 'node-sync-fs-in-handler',
    file: 'src/handlers/user.ts',
    fires: false,
    content: "const data = await fs.promises.readFile('foo.txt');",
    desc: 'NEGATYWNA: asynchronous fs.promises allowed inside request handler',
  },
];

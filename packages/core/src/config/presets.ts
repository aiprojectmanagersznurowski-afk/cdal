import type { BashRule, ForbiddenRule } from './types.js';

export interface PresetDefinition {
  id: string;
  description: string;
  forbidden?: ForbiddenRule[];
  bashRules?: BashRule[];
  protectedPaths?: string[];
}

export const BUILTIN_PRESETS: Record<string, PresetDefinition> = {
  'typescript-strict': {
    id: 'typescript-strict',
    description: 'Strict TypeScript invariant patterns: bans @ts-ignore, as any, and skipped tests',
    forbidden: [
      {
        id: 'ts-ignore',
        re: '@ts-(ignore|expect-error)',
        appliesTo: '\\.(ts|tsx)$',
        msg: 'Silencing type errors (@ts-ignore / @ts-expect-error) is prohibited. Fix types properly.',
      },
      {
        id: 'as-any',
        re: '\\bas\\s+any\\b',
        appliesTo: '\\.(ts|tsx)$',
        msg: 'Unsafe casting to "any" (as any) is prohibited. Model types explicitly.',
      },
      {
        id: 'skipped-test',
        re: '\\b(it|test|describe)\\.(skip|only)\\b',
        appliesTo: '\\.(ts|tsx|js|mjs)$',
        msg: 'Muted or isolated tests (.skip / .only) are prohibited. Test suite must run fully.',
      },
      {
        id: 'gate-evasion-split-identifier',
        re: '\\[\\s*(?:[\'"][A-Za-z_][A-Za-z0-9_]{0,15}[\'"]\\s*,\\s*)+[\'"][A-Za-z_][A-Za-z0-9_]{0,15}[\'"]\\s*\\]\\s*\\.\\s*join\\(\\s*(?:\'\'|"")\\s*\\)|[\'"][A-Za-z_][A-Za-z0-9_]*[\'"]\\s*\\+\\s*[\'"][A-Za-z_][A-Za-z0-9_]*[\'"]',
        appliesTo: '\\.(ts|tsx)$',
        allowIn: ['/tests/', '.test.', '.spec.', '/e2e/'],
        msg: 'Split identifier detected (join with empty separator or literal concatenation). Do not obscure identifiers to evade scanning.',
      },
      {
        id: 'gate-evasion-prisma-recast',
        re: '\\b\\w*[Pp]risma\\w*\\s+as\\s+unknown\\s+as\\b|\\bas\\s+unknown\\s+as\\s+\\w*(?:Prisma|Delegate)\\w*\\b',
        appliesTo: '\\.(ts|tsx)$',
        msg: 'Double-casting Prisma client via unknown (prisma as unknown as X) is prohibited. It circumvents type verification.',
      },
    ],
  },
  nextjs: {
    id: 'nextjs',
    description: 'Next.js best practices: prevents server secret leakage in client code',
    forbidden: [
      {
        id: 'nextjs-service-key-client',
        re: 'SUPABASE_SERVICE_ROLE_KEY|service_role|STRIPE_SECRET_KEY',
        appliesTo: '(app|components|hooks)/.*\\.(tsx)$',
        msg: 'Server secret keys must never be referenced inside client-side components.',
      },
      {
        id: 'nextjs-hardcoded-hex',
        re: '#[0-9a-fA-F]{6}\\b',
        appliesTo: 'apps/.*\\.(tsx|css)$',
        allowIn: ['globals.css', 'tailwind.config', 'theme'],
        msg: 'Hardcoded hex colors are prohibited. Use design system tokens or Tailwind theme classes.',
      },
    ],
  },
  'node-service': {
    id: 'node-service',
    description: 'Node.js backend service hygiene',
    forbidden: [
      {
        id: 'node-sync-fs-in-handler',
        re: '\\bfs\\.(readFileSync|writeFileSync|existsSync)\\b',
        appliesTo: '(src|app)/(api|routes|handlers)/.*\\.(ts|js)$',
        msg: 'Synchronous fs calls block the event loop in request handlers. Use node:fs/promises.',
      },
    ],
  },
  'safe-defaults': {
    id: 'safe-defaults',
    description: 'Default agent shell command guardrails',
    bashRules: [
      {
        re: 'rm\\s+-rf\\s+(/|~|\\$HOME|\\*)',
        msg: 'Recursive deletion outside working directory is blocked.',
      },
      {
        re: 'git\\s+push\\s+(-f|--force)(?!-with-lease)',
        msg: 'Unsafe force push is blocked. Use --force-with-lease on dedicated feature branch.',
      },
      {
        re: 'git\\s+(checkout|switch)\\s+(main|master)\\s*$',
        msg: 'Direct work on main branch is blocked. Create and switch to a feature branch.',
      },
      {
        re: 'DROP\\s+(TABLE|DATABASE|SCHEMA)',
        msg: 'Destructive DDL is blocked.',
      },
      {
        re: 'npm\\s+publish|pnpm\\s+publish',
        msg: 'Direct package publishing from agent shell is prohibited. Use human release workflow.',
      },
      {
        re: 'vercel\\s+(deploy|--prod)',
        msg: 'Direct production deployment is prohibited without explicit human approval.',
      },
    ],
  },
};

export function isKnownPreset(preset: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUILTIN_PRESETS, preset);
}

export function getPreset(preset: string): PresetDefinition | null {
  return BUILTIN_PRESETS[preset] ?? null;
}

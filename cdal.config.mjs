import { defineConfig } from '@cdal/core';
import { policies, requirements, stateMachine } from '@cdal/kinds';

export default defineConfig({
  contractsDir: 'contracts',
  generated: {
    ts: 'packages/core/src/generated/contracts',
    docs: 'docs/generated',
  },
  kinds: [requirements()],
  protectedPaths: ['contracts/', 'packages/core/src/generated/contracts/'],
  roles: {
    'spec-analyst': { write: ['docs/workorders/', '.cdal/state/'] },
    'contract-steward': { write: ['contracts/', 'packages/core/src/generated/contracts/'] },
    'test-author': { write: ['packages/*/test/', 'tests/', '.cdal/state/'] },
    implementer: { write: ['packages/', 'src/', '.cdal/state/'], denyTests: true },
    reviewer: { write: ['.cdal/memory/'] },
  },
  presets: ['typescript-strict'],
  forbidden: [],
  bash: { preset: 'safe-defaults', extra: [] },
  verify: [
    'node packages/cli/bin/cdal.mjs validate --strict',
    'node packages/cli/bin/cdal.mjs codegen --check',
    'pnpm typecheck',
    'pnpm lint',
    'pnpm test',
    'node packages/cli/bin/cdal.mjs trace --enforce',
    'node packages/cli/bin/cdal.mjs selftest',
  ],
  runtimes: ['claude-code', 'agents-md', 'antigravity'],
});

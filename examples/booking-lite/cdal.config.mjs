import { defineConfig } from '@cdal/core';
import { policies, requirements, stateMachine } from '@cdal/kinds';

export default defineConfig({
  contractsDir: 'contracts',
  generated: {
    ts: 'src/generated/contracts',
    docs: 'docs/generated',
  },
  kinds: [requirements(), stateMachine(), policies()],
  protectedPaths: ['contracts/**', 'src/generated/**'],
  roles: {
    'spec-analyst': {
      write: ['docs/**', '.cdal/state/**'],
    },
    'contract-steward': {
      write: ['contracts/**', 'src/generated/contracts/**'],
    },
    'test-author': {
      write: ['test/**', '.cdal/state/**'],
    },
    implementer: {
      write: ['src/**', '.cdal/state/**'],
      denyTests: true,
    },
    reviewer: {
      write: ['.cdal/memory/**'],
    },
  },
  verify: [
    'node ../../packages/cli/bin/cdal.mjs validate --strict',
    'node ../../packages/cli/bin/cdal.mjs codegen --check',
    'pnpm typecheck',
    'pnpm test',
    'node ../../packages/cli/bin/cdal.mjs trace --enforce',
    'node ../../packages/cli/bin/cdal.mjs selftest',
  ],
  runtimes: ['claude-code', 'agents-md', 'antigravity'],
});

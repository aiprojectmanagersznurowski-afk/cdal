import type { ResolvedCdalConfig } from '@cdal/core';
import { describe, expect, it } from 'vitest';
import {
  AGENTS_MD_SECTION_END,
  AGENTS_MD_SECTION_START,
  generateAgentsMdFiles,
  generateCursorRules,
  updateAgentsMd,
} from '../src/agents-md/agents-md.js';

describe('AGENTS.md & Cursor Adapter', () => {
  const dummyConfig: ResolvedCdalConfig = {
    contractsDir: 'contracts',
    generated: { ts: 'src/generated/contracts', docs: 'docs/generated' },
    kinds: [],
    protectedPaths: ['contracts/'],
    roles: {
      'spec-analyst': { write: ['docs/workorders/'] },
      'test-author': { write: ['tests/'] },
      implementer: { write: ['src/'], denyTests: true },
      reviewer: { write: ['.cdal/memory/'] },
    },
    presets: ['typescript-strict'],
    forbidden: [],
    bash: { preset: 'safe-defaults', extra: [] },
    verify: ['pnpm typecheck', 'pnpm test'],
    runtimes: ['agents-md'],
  };

  // @REQ: CDAL-REQ-ADAPTER-AGENTS
  it('updates AGENTS.md managed section preserving user content', () => {
    const emptyResult = updateAgentsMd('', dummyConfig);
    expect(emptyResult).toContain(AGENTS_MD_SECTION_START);
    expect(emptyResult).toContain(AGENTS_MD_SECTION_END);

    const userInstructions = '# Core Project Directives\n\n- Write clear documentation.\n';
    const updated = updateAgentsMd(userInstructions, dummyConfig);
    expect(updated.startsWith('# Core Project Directives')).toBe(true);
    expect(updated).toContain(AGENTS_MD_SECTION_START);
    expect(updated).toContain('cdalkit phase red');
    expect(updated).toContain('cdalkit phase green');
  });

  it('generates .cursor/rules/cdal.mdc with valid frontmatter', () => {
    const rules = generateCursorRules(dummyConfig);
    expect(rules).toContain('---');
    expect(rules).toContain('description:');
    expect(rules).toContain('globs: *');
    expect(rules).toContain('alwaysApply: true');
    expect(rules).toContain('contracts/*.contract.mjs');
  });

  it('generates all expected files for agents-md runtime', () => {
    const files = generateAgentsMdFiles(dummyConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('.cursor/rules/cdal.mdc');
  });
});

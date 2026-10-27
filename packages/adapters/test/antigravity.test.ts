import type { ResolvedCdalConfig } from '@cdal/core';
import { describe, expect, it } from 'vitest';
import {
  ANTIGRAVITY_RULES_CHAR_LIMIT,
  generateAntigravityAgents,
  generateAntigravityFiles,
  generateAntigravityRules,
  generateAntigravityWorkflows,
  mapToolsToAntigravity,
} from '../src/antigravity/antigravity.js';

describe('Antigravity / Gemini Adapter', () => {
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
    forbidden: [
      { id: 'no-any', re: /\bas\s+any\b/, appliesTo: ['**/*.ts'], msg: 'Forbidden as any' },
    ],
    bash: { preset: 'safe-defaults', extra: [] },
    verify: ['pnpm typecheck', 'pnpm test'],
    runtimes: ['antigravity'],
  };

  // @REQ: CDAL-REQ-ADAPTER-ANTIGRAVITY
  it('correctly maps Claude tools to Antigravity tools', () => {
    const tools = mapToolsToAntigravity(['Read', 'Write', 'Edit', 'Bash', 'Task']);
    expect(tools).toContain('view_file');
    expect(tools).toContain('write_to_file');
    expect(tools).toContain('replace_file_content');
    expect(tools).toContain('run_command');
    expect(tools).toContain('invoke_subagent');
  });

  it('generates agent definitions with proper commandExecutionPolicy', () => {
    const agents = generateAntigravityAgents(dummyConfig);
    expect(agents).toHaveLength(4);

    const implementer = agents.find((a) => a.path.includes('implementer'));
    expect(implementer).toBeDefined();
    expect(implementer?.content).toContain('subagent: true');
    expect(implementer?.content).toContain('commandExecutionPolicy: sandbox');

    const specAnalyst = agents.find((a) => a.path.includes('spec-analyst'));
    expect(specAnalyst).toBeDefined();
    expect(specAnalyst?.content).toContain('mainAgent: true');
  });

  it('generates workflows for CDAL loop steps', () => {
    const workflows = generateAntigravityWorkflows();
    expect(workflows.length).toBeGreaterThanOrEqual(6);
    const paths = workflows.map((w) => w.path);
    expect(paths).toContain('.agents/workflows/cdal-plan.md');
    expect(paths).toContain('.agents/workflows/cdal-loop.md');
    expect(paths).toContain('.agents/workflows/cdal-verify.md');
  });

  it('generates rules that strictly obey the 12000 character limit', () => {
    const rules = generateAntigravityRules(dummyConfig);
    expect(rules).toHaveLength(1);
    const firstRule = rules[0];
    expect(firstRule).toBeDefined();
    expect(firstRule?.content.length).toBeLessThan(ANTIGRAVITY_RULES_CHAR_LIMIT);
    expect(firstRule?.content).toContain('# CDAL Quality Gates for Antigravity');
    expect(firstRule?.content).toContain('Forbidden as any');
  });

  it('generates all expected Antigravity files', () => {
    const files = generateAntigravityFiles(dummyConfig);
    expect(files.some((f) => f.path.startsWith('.agents/agents/'))).toBe(true);
    expect(files.some((f) => f.path.startsWith('.agents/workflows/'))).toBe(true);
    expect(files.some((f) => f.path.startsWith('.agents/rules/'))).toBe(true);
  });
});

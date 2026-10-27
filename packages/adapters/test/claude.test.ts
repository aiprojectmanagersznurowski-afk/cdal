import type { ResolvedCdalConfig } from '@cdal/core';
import { describe, expect, it } from 'vitest';
import {
  CLAUDE_SECTION_END,
  CLAUDE_SECTION_START,
  generateClaudeAgents,
  generateClaudeCommands,
  generateClaudeFiles,
  generateClaudeSettings,
  updateClaudeMd,
} from '../src/claude/claude.js';

describe('Claude Code Adapter', () => {
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
    runtimes: ['claude-code'],
  };

  // @REQ: CDAL-REQ-ADAPTER-CLAUDE
  it('generates valid Claude settings with hook entries', () => {
    const raw = generateClaudeSettings();
    const parsed = JSON.parse(raw);
    expect(parsed.hooks.PreToolUse).toBeDefined();
    expect(
      parsed.hooks.PreToolUse.some((h: { command: string }) => h.command.includes('guard-paths')),
    ).toBe(true);
    expect(
      parsed.hooks.PreToolUse.some((h: { command: string }) =>
        h.command.includes('guard-forbidden'),
      ),
    ).toBe(true);
    expect(
      parsed.hooks.PreToolUse.some((h: { command: string }) => h.command.includes('guard-bash')),
    ).toBe(true);
  });

  it('generates agent definitions for all roles in config', () => {
    const agents = generateClaudeAgents(dummyConfig);
    expect(agents).toHaveLength(4);
    const names = agents.map((a) => a.path);
    expect(names).toContain('.claude/agents/implementer.md');
    expect(names).toContain('.claude/agents/test-author.md');

    const implementer = agents.find((a) => a.path.includes('implementer'));
    expect(implementer).toBeDefined();
    expect(implementer?.content).toContain('name: implementer');
    expect(implementer?.content).toContain('guard-paths implementer');
  });

  it('generates CDAL commands for loop workflow', () => {
    const cmds = generateClaudeCommands();
    expect(cmds.length).toBeGreaterThanOrEqual(6);
    const cmdPaths = cmds.map((c) => c.path);
    expect(cmdPaths).toContain('.claude/commands/cdal-plan.md');
    expect(cmdPaths).toContain('.claude/commands/cdal-contract.md');
    expect(cmdPaths).toContain('.claude/commands/cdal-loop.md');
    expect(cmdPaths).toContain('.claude/commands/cdal-verify.md');
    expect(cmdPaths).toContain('.claude/commands/cdal-review.md');
    expect(cmdPaths).toContain('.claude/commands/cdal-release-gate.md');
  });

  it('updates CLAUDE.md managed section while preserving user content', () => {
    const emptyResult = updateClaudeMd('', dummyConfig);
    expect(emptyResult).toContain(CLAUDE_SECTION_START);
    expect(emptyResult).toContain(CLAUDE_SECTION_END);

    const userContent = '# Custom Project Rules\n\n- Do not break user sessions.\n';
    const initial = updateClaudeMd(userContent, dummyConfig);
    expect(initial.startsWith('# Custom Project Rules')).toBe(true);
    expect(initial).toContain(CLAUDE_SECTION_START);

    // Re-updating with updated config
    const updatedConfig = {
      ...dummyConfig,
      verify: ['pnpm typecheck', 'pnpm test', 'npx cdal selftest'],
    };
    const updated = updateClaudeMd(initial, updatedConfig);
    expect(updated.startsWith('# Custom Project Rules')).toBe(true);
    expect(updated).toContain('npx cdal selftest');
    expect(updated.indexOf(CLAUDE_SECTION_START)).toBe(updated.lastIndexOf(CLAUDE_SECTION_START));
  });

  it('generates all expected Claude files', () => {
    const files = generateClaudeFiles(dummyConfig);
    const paths = files.map((f) => f.path);
    expect(paths).toContain('.claude/settings.json');
    expect(paths).toContain('CLAUDE.md');
    expect(paths.some((p) => p.startsWith('.claude/agents/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('.claude/commands/'))).toBe(true);
  });
});

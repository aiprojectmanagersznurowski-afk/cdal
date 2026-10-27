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

  type HookHandler = { type: string; command: string };
  type MatcherGroup = { matcher?: string; hooks: HookHandler[] };

  // @REQ: CDAL-REQ-ADAPTER-CLAUDE
  it('generates settings in the Claude Code hooks schema (matcher groups with typed handlers)', () => {
    const parsed = JSON.parse(generateClaudeSettings()) as {
      hooks: Record<string, MatcherGroup[]>;
    };

    // Claude Code ignores entries that put `command` directly on the matcher group.
    for (const [event, groups] of Object.entries(parsed.hooks)) {
      expect(Array.isArray(groups), event).toBe(true);
      for (const group of groups) {
        expect(group, event).not.toHaveProperty('command');
        expect(Array.isArray(group.hooks), event).toBe(true);
        for (const handler of group.hooks) {
          expect(handler.type, event).toBe('command');
          expect(handler.command, event).toMatch(/^npx cdalkit hook /);
        }
      }
    }

    const preToolUse = parsed.hooks.PreToolUse.flatMap((g) =>
      g.hooks.map((h) => `${g.matcher} -> ${h.command}`),
    );
    expect(preToolUse).toContain('Edit|Write|NotebookEdit -> npx cdalkit hook guard-paths');
    expect(preToolUse).toContain('Edit|Write -> npx cdalkit hook guard-forbidden');
    expect(preToolUse).toContain('Bash -> npx cdalkit hook guard-bash');
  });

  // @REQ: CDAL-REQ-ADAPTER-CLAUDE
  it('writes role hooks in subagent frontmatter using the same schema', () => {
    const implementer = generateClaudeAgents(dummyConfig).find((a) =>
      a.path.endsWith('/implementer.md'),
    );
    expect(implementer?.content).toContain(
      [
        'hooks:',
        '  PreToolUse:',
        '    - matcher: "Edit|Write|NotebookEdit"',
        '      hooks:',
        '        - type: command',
        '          command: "npx cdalkit hook guard-paths implementer"',
      ].join('\n'),
    );
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
      verify: ['pnpm typecheck', 'pnpm test', 'npx cdalkit selftest'],
    };
    const updated = updateClaudeMd(initial, updatedConfig);
    expect(updated.startsWith('# Custom Project Rules')).toBe(true);
    expect(updated).toContain('npx cdalkit selftest');
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

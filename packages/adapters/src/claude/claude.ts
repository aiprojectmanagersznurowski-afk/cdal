import type { ResolvedCdalConfig } from '@cdal/core';

export const CLAUDE_SECTION_START = '<!-- BEGIN CDAL MANAGED SECTION -->';
export const CLAUDE_SECTION_END = '<!-- END CDAL MANAGED SECTION -->';

/** One Claude Code matcher group: hook handlers run when the tool name matches. */
function hookGroup(command: string, matcher?: string) {
  return {
    ...(matcher ? { matcher } : {}),
    hooks: [{ type: 'command', command }],
  };
}

export function generateClaudeSettings(): string {
  const settings = {
    hooks: {
      PreToolUse: [
        hookGroup('npx cdalkit hook guard-paths', 'Edit|Write|NotebookEdit'),
        hookGroup('npx cdalkit hook guard-forbidden', 'Edit|Write'),
        hookGroup('npx cdalkit hook guard-bash', 'Bash'),
      ],
      SessionStart: [hookGroup('npx cdalkit hook session-context')],
      SubagentStart: [hookGroup('npx cdalkit hook log-subagent')],
      SubagentStop: [hookGroup('npx cdalkit hook log-subagent')],
    },
  };

  return `${JSON.stringify(settings, null, 2)}\n`;
}

const DEFAULT_ROLE_INSTRUCTIONS: Record<
  string,
  { description: string; tools: string[]; prompt: string }
> = {
  'spec-analyst': {
    description:
      'Work order and specification author. Defines acceptance criteria and requirements.',
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
    prompt: `You are the Spec Analyst agent in the CDAL (Contract-Driven Agentic Loop) workflow.
Your role is to formulate Work Orders, analyze system requirements, and define concrete acceptance criteria.
You do NOT author test code or production implementation.

Write Scope: docs/workorders/, .cdal/state/
Discipline:
- Formulate requirements with verifiable acceptance criteria.
- Assign requirement IDs with prefix REQ-*.`,
  },
  'contract-steward': {
    description:
      'Contract author and invariant steward. Manages *.contract.mjs single sources of truth.',
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'],
    prompt: `You are the Contract Steward agent in the CDAL workflow.
Your role is to maintain contracts (*.contract.mjs) as the sole, single source of truth.
You ensure invariant rules are strictly satisfied and that generated types remain in sync.

Write Scope: contracts/, src/generated/contracts/, .cdal/state/
Discipline:
- Only edit contracts when the contract window is open (cdal window open <TICKET>).
- Run "cdal validate --strict" and "cdal codegen" after any contract modification.
- Never write production features or tests.`,
  },
  'test-author': {
    description:
      'Test author. Creates failing RED tests tagged with @REQ before any production code.',
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'],
    prompt: `You are the Test Author agent in the CDAL workflow.
Your role is to write failing tests in the RED phase before any production code is written.
Every test you author MUST be tagged with the matching requirement ID using the comment:
// @REQ: REQ-ID

Write Scope: tests/, **/*.test.ts, **/*.spec.ts, .cdal/state/
Discipline:
- NEVER touch production code.
- Verify tests initially fail (RED phase).
- Ensure 100% traceability for all requirements under implementation.`,
  },
  implementer: {
    description: 'Production code implementer. Makes failing RED tests pass in the GREEN phase.',
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Bash'],
    prompt: `You are the Implementer agent in the CDAL workflow.
Your role is to write production code that satisfies contracts and makes failing RED tests pass (GREEN phase).

Write Scope: src/, app/, lib/, .cdal/state/
Physical Constraint: You are physically prohibited from editing or authoring test files (denyTests: true).
Discipline:
- Never edit test files. If a test appears defective, report TEST-DEFECT and stop.
- Never silence TypeScript errors with @ts-ignore or "as any".
- Verify code compiles and passes tests cleanly.`,
  },
  reviewer: {
    description: 'Quality gate reviewer. Audits diff, phase rules, and traceability before merge.',
    tools: ['Read', 'Glob', 'Grep', 'Bash'],
    prompt: `You are the Reviewer agent in the CDAL workflow.
Your role is to perform an audit of changes before merging. You verify that:
1. "cdal verify" runs completely clean.
2. "cdal trace --enforce" confirms all requirements have passing tests.
3. No forbidden patterns or type silences were introduced.
4. Diff satisfies active phase constraints (cdal phase green).

Write Scope: .cdal/memory/`,
  },
};

export function generateClaudeAgents(
  config: ResolvedCdalConfig,
): Array<{ path: string; content: string }> {
  const result: Array<{ path: string; content: string }> = [];
  const roles =
    Object.keys(config.roles).length > 0
      ? config.roles
      : {
          'spec-analyst': { write: ['docs/workorders/', '.cdal/state/'] },
          'contract-steward': { write: ['contracts/', 'src/generated/contracts/'] },
          'test-author': { write: ['tests/', '**/*.test.ts'] },
          implementer: { write: ['src/', 'app/'], denyTests: true },
          reviewer: { write: ['.cdal/memory/'] },
        };

  for (const [roleName, roleDef] of Object.entries(roles)) {
    const defaultInfo = DEFAULT_ROLE_INSTRUCTIONS[roleName] ?? {
      description: `CDAL agent role for ${roleName}.`,
      tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
      prompt: `You are the ${roleName} agent in the CDAL workflow.\nAllowed write scopes: ${roleDef.write.join(', ')}`,
    };

    const frontmatter = [
      '---',
      `name: ${roleName}`,
      `description: ${defaultInfo.description}`,
      'tools:',
      ...defaultInfo.tools.map((t) => `  - ${t}`),
      'hooks:',
      '  PreToolUse:',
      '    - matcher: "Edit|Write|NotebookEdit"',
      '      hooks:',
      '        - type: command',
      `          command: "npx cdalkit hook guard-paths ${roleName}"`,
      '---',
      '',
    ].join('\n');

    const content = `${frontmatter}<!-- CDAL GENERATED AGENT ROLE: ${roleName} -->\n\n${defaultInfo.prompt.trim()}\n`;
    result.push({
      path: `.claude/agents/${roleName}.md`,
      content,
    });
  }

  return result;
}

export function generateClaudeCommands(): Array<{ path: string; content: string }> {
  return [
    {
      path: '.claude/commands/cdal-plan.md',
      content: `---
description: Start a new CDAL loop cycle with a Work Order and requirement definitions
---

# /cdal-plan

Initiate the planning phase of the Contract-Driven Agentic Loop.
1. Run \`spec-analyst\` agent to specify requirement IDs, statements, and acceptance criteria.
2. Record active ticket in \`.cdal/state/current-workorder.json\`.
`,
    },
    {
      path: '.claude/commands/cdal-contract.md',
      content: `---
description: Manage contract window and update contracts as single source of truth
---

# /cdal-contract

1. Open contract window: \`npx cdalkit window open <TICKET>\`
2. Run \`contract-steward\` to update \`contracts/*.contract.mjs\`.
3. Validate invariants: \`npx cdalkit validate --strict\`
4. Regenerate artifacts: \`npx cdalkit codegen\`
5. Close contract window: \`npx cdalkit window close\`
`,
    },
    {
      path: '.claude/commands/cdal-loop.md',
      content: `---
description: Execute CDAL phase loop (PLAN -> CONTRACT -> RED -> GREEN -> VERIFY -> REVIEW)
---

# /cdal-loop

Enforces the deterministic CDAL loop:
1. **PLAN**: Define requirements with \`spec-analyst\`.
2. **CONTRACT**: Update contracts if needed with \`contract-steward\`.
3. **RED**: Write failing tests with \`test-author\` (\`cdal phase red\`).
4. **GREEN**: Implement production code with \`implementer\` (\`cdal phase green\`).
5. **VERIFY**: Run full deterministic verification (\`pnpm verify\`).
6. **REVIEW**: Verify zero drift and trace coverage (\`cdal trace --enforce\`).
`,
    },
    {
      path: '.claude/commands/cdal-verify.md',
      content: `---
description: Run full deterministic CDAL verification pipeline
---

# /cdal-verify

Executes verification pipeline defined in \`cdal.config.mjs\`:
\`\`\`bash
pnpm verify
\`\`\`
`,
    },
    {
      path: '.claude/commands/cdal-review.md',
      content: `---
description: Run pre-merge review and audit on active branch
---

# /cdal-review

Runs \`reviewer\` role to verify:
- \`npx cdalkit phase green\`
- \`npx cdalkit trace --enforce\`
- \`npx cdalkit selftest\`
`,
    },
    {
      path: '.claude/commands/cdal-release-gate.md',
      content: `---
description: Release gate check before merging to main
---

# /cdal-release-gate

Validates that:
1. All changesets are recorded.
2. Clean working tree.
3. Full verification is green.
`,
    },
  ];
}

export function generateManagedSection(config: ResolvedCdalConfig): string {
  const verifySteps = config.verify.map((v) => `- \`${v}\``).join('\n');
  const rolesList = Object.keys(config.roles)
    .map((r) => `- \`${r}\``)
    .join('\n');

  return `${CLAUDE_SECTION_START}
## Contract-Driven Agentic Loop (CDAL) Quality Gates

This repository enforces contract-driven development quality gates:
1. **Loop**: PLAN → CONTRACT → RED → GREEN → VERIFY → REVIEW → INTEGRATE.
2. **Contracts as Single Source of Truth**: All invariants and state machines live in \`${config.contractsDir}/*.contract.mjs\`.
3. **Role Scopes & Test Isolation**:
${rolesList}
   - Implementers are physically blocked from modifying test files (\`denyTests: true\`).
   - Test files are marked with \`// @REQ: <ID>\` tags.
4. **Deterministic Verification**:
${verifySteps}
${CLAUDE_SECTION_END}`;
}

export function updateClaudeMd(existingContent: string, config: ResolvedCdalConfig): string {
  const managedSection = generateManagedSection(config);

  if (
    existingContent.includes(CLAUDE_SECTION_START) &&
    existingContent.includes(CLAUDE_SECTION_END)
  ) {
    const before = existingContent.slice(0, existingContent.indexOf(CLAUDE_SECTION_START));
    const after = existingContent.slice(
      existingContent.indexOf(CLAUDE_SECTION_END) + CLAUDE_SECTION_END.length,
    );
    return `${before.trimEnd()}\n\n${managedSection}\n${after.trimStart()}`;
  }

  if (!existingContent.trim()) {
    return `# Project Instructions\n\n${managedSection}\n`;
  }

  return `${existingContent.trimEnd()}\n\n${managedSection}\n`;
}

export function generateClaudeFiles(
  config: ResolvedCdalConfig,
  existingClaudeMd = '',
): Array<{ path: string; content: string }> {
  return [
    {
      path: '.claude/settings.json',
      content: generateClaudeSettings(),
    },
    ...generateClaudeAgents(config),
    ...generateClaudeCommands(),
    {
      path: 'CLAUDE.md',
      content: updateClaudeMd(existingClaudeMd, config),
    },
  ];
}

import type { ResolvedCdalConfig } from '@cdal/core';

export const AGENTS_MD_SECTION_START = '<!-- BEGIN CDAL MANAGED SECTION -->';
export const AGENTS_MD_SECTION_END = '<!-- END CDAL MANAGED SECTION -->';

export function generateAgentsMdManagedSection(config: ResolvedCdalConfig): string {
  const verifySteps = config.verify.map((v) => `- \`${v}\``).join('\n');
  const rolesList = Object.entries(config.roles)
    .map(
      ([role, def]) =>
        `- **${role}**: write scopes \`${def.write.join(', ')}\`${def.denyTests ? ' (STRICTLY DENIED from editing tests)' : ''}`,
    )
    .join('\n');

  return `${AGENTS_MD_SECTION_START}
## Contract-Driven Agentic Loop (CDAL) Quality Gates

This project enforces strict contract-driven development quality gates:

### 1. The Loop Cycle
\`PLAN\` → \`CONTRACT\` → \`RED\` → \`GREEN\` → \`VERIFY\` → \`REVIEW\` → \`INTEGRATE\`

- **PLAN**: Define requirements with explicit IDs (\`REQ-*\`) in work orders.
- **CONTRACT**: Invariants and state machines live in \`${config.contractsDir}/*.contract.mjs\`. Modify only when window is open.
- **RED**: Write failing tests tagged with \`// @REQ: <ID>\`. Validate failure before implementing.
- **GREEN**: Implement production features to pass tests. Never modify tests in this phase.
- **VERIFY**: Run full deterministic verification pipeline (\`npx cdal verify\`).
- **REVIEW**: Validate zero drift, phase compliance, and full requirement traceability.

### 2. Role Boundaries & Phase Enforcement
${rolesList}

> **Phase Gate Enforcement:**
> In runtimes without pre-tool hooks (Codex, Cursor, etc.), phase compliance is enforced via \`cdal phase\`:
> - Check RED phase: \`npx cdal phase red --base <ref>\`
> - Check GREEN phase: \`npx cdal phase green --base <ref>\`
> - Check CONTRACT phase: \`npx cdal phase contract --base <ref>\`
> All PRs must satisfy \`npx cdal phase green --base origin/main\` in CI.

### 3. Deterministic Verification Steps
${verifySteps}
${AGENTS_MD_SECTION_END}`;
}

export function updateAgentsMd(existingContent: string, config: ResolvedCdalConfig): string {
  const managedSection = generateAgentsMdManagedSection(config);

  if (
    existingContent.includes(AGENTS_MD_SECTION_START) &&
    existingContent.includes(AGENTS_MD_SECTION_END)
  ) {
    const before = existingContent.slice(0, existingContent.indexOf(AGENTS_MD_SECTION_START));
    const after = existingContent.slice(
      existingContent.indexOf(AGENTS_MD_SECTION_END) + AGENTS_MD_SECTION_END.length,
    );
    return `${before.trimEnd()}\n\n${managedSection}\n${after.trimStart()}`;
  }

  if (!existingContent.trim()) {
    return `# AGENTS.md — Agent Quality & Role Guidelines\n\n${managedSection}\n`;
  }

  return `${existingContent.trimEnd()}\n\n${managedSection}\n`;
}

export function generateCursorRules(config: ResolvedCdalConfig): string {
  return `---
description: CDAL Quality Gates, Contract Verification & Phase Rules
globs: *
alwaysApply: true
---

# CDAL Quality Gates for Cursor

This project enforces Contract-Driven Agentic Loop (CDAL) quality gates:
1. **Contracts First**: Single source of truth in \`${config.contractsDir}/*.contract.mjs\`.
2. **Phase Discipline**:
   - RED phase: Only write tests (tagged with \`// @REQ: <ID>\`).
   - GREEN phase: Only write production code. Do NOT touch or weaken tests.
   - Run \`npx cdal phase green\` before submitting changes.
3. **Verification**: Always run \`pnpm verify\` or \`npx cdal verify\` before declaring completion.
4. **Forbidden Patterns**: Never use \`@ts-ignore\` or \`as any\` to silence compiler errors.
`;
}

export function generateAgentsMdFiles(
  config: ResolvedCdalConfig,
  existingAgentsMd = '',
): Array<{ path: string; content: string }> {
  return [
    {
      path: 'AGENTS.md',
      content: updateAgentsMd(existingAgentsMd, config),
    },
    {
      path: '.cursor/rules/cdal.mdc',
      content: generateCursorRules(config),
    },
  ];
}

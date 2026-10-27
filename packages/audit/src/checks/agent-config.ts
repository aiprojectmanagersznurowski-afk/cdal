import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkspaceFiles } from '../crawler.js';
import type { AuditCheckResult, AuditFinding } from '../types.js';

export function checkAgentConfig(files: WorkspaceFiles, weight = 15): AuditCheckResult {
  const findings: AuditFinding[] = [];
  const foundConfigs: string[] = [];

  const configCandidates = [
    'CLAUDE.md',
    'AGENTS.md',
    'GEMINI.md',
    '.claude/settings.json',
    '.cursor/rules',
    '.cursorrules',
    '.agents',
    'cdal.config.mjs',
  ];

  for (const candidate of configCandidates) {
    if (existsSync(join(files.cwd, candidate))) {
      foundConfigs.push(candidate);
    }
  }

  let hasPreToolHook = false;
  const claudeSettingsPath = join(files.cwd, '.claude/settings.json');
  if (existsSync(claudeSettingsPath)) {
    try {
      const content = readFileSync(claudeSettingsPath, 'utf8');
      if (content.includes('PreToolUse') || content.includes('cdal hook')) {
        hasPreToolHook = true;
      }
    } catch {
      // ignore
    }
  }

  // Also check .agents/hooks.json or similar
  const agentsHooksPath = join(files.cwd, '.agents/hooks.json');
  if (existsSync(agentsHooksPath)) {
    hasPreToolHook = true;
  }

  let score = 0;
  let details = '';

  if (foundConfigs.length === 0) {
    score = 0;
    details =
      'No AI agent configuration files (e.g. CLAUDE.md, AGENTS.md, .claude/settings.json). Agents work without project guidelines.';
    findings.push({
      message: 'No agent configuration in the repository.',
      severity: 'error',
    });
  } else if (!hasPreToolHook) {
    score = Math.round(weight * 0.45); // e.g. 7/15
    details = `Found agent configuration (${foundConfigs.join(', ')}), but no hard PreToolUse hooks. Agents rely only on soft prompts.`;
    findings.push({
      message: 'No PreToolUse hooks — rules in prompts can be ignored or bypassed by the LLM.',
      severity: 'warn',
    });
  } else {
    score = weight;
    details = `Exemplary agent configuration (${foundConfigs.join(', ')}) with active PreToolUse hooks.`;
  }

  return {
    id: 'agent-config',
    name: 'Agent configuration and hard PreToolUse hooks',
    weight,
    score,
    maxScore: weight,
    passed: score >= weight * 0.7,
    details,
    findings,
    docsUrl: 'https://cdal.dev/docs/concepts/roles',
  };
}

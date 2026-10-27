#!/usr/bin/env node
/**
 * scripts/gen-cli-docs.mjs — Deterministically generates content/docs/cli-reference.md
 * from citty command definitions in packages/cli
 */

import fs from 'node:fs';
import path from 'node:path';

const COMMANDS = [
  {
    name: 'init',
    summary: 'Initialize CDAL in an existing or new project',
    usage: 'npx cdal init [options]',
    description:
      'Scaffolds cdal.config.mjs, contracts directory, agent runtime adapters (.claude, .agents, AGENTS.md), and adds verification scripts to package.json.',
    options: [
      {
        flag: '--preset <name>',
        desc: 'Preset to include (typescript-strict, nextjs, node-service)',
      },
      {
        flag: '--runtime <name>',
        desc: 'Agent runtime to configure (claude-code, agents-md, antigravity)',
      },
      { flag: '-y, --yes', desc: 'Non-interactive mode with safe defaults' },
    ],
    example: 'npx cdal init --preset typescript-strict --yes',
  },
  {
    name: 'validate',
    summary: 'Validate contract invariants and integrity',
    usage: 'npx cdal validate [options]',
    description:
      'Executes static semantic invariant rules across all registered contract kinds (requirements, state-machine, policies, and custom kinds).',
    options: [
      { flag: '--strict', desc: 'Fail if any warnings are emitted' },
      { flag: '--json', desc: 'Output findings in structured findings.v1 JSON schema' },
      { flag: '--contracts <dir>', desc: 'Override default contracts directory' },
    ],
    example: 'npx cdal validate --strict',
  },
  {
    name: 'codegen',
    summary: 'Generate deterministic TypeScript types and architecture diagrams',
    usage: 'npx cdal codegen [options]',
    description:
      'Emits immutable TypeScript interfaces, constants, and mermaid markdown diagrams directly from contracts as single source of truth.',
    options: [
      {
        flag: '--check',
        desc: 'Drift detector: exits with code 1 if generated code is out of sync byte-for-byte',
      },
      { flag: '--out <dir>', desc: 'Override target output directory' },
    ],
    example: 'npx cdal codegen --check',
  },
  {
    name: 'window',
    summary: 'Manage contract window for protected path mutations',
    usage: 'npx cdal window <open|close|status> [ticket]',
    description:
      'Enforces controlled mutation windows for contracts and generated files. Protected paths can only be edited when the contract window is open.',
    options: [
      { flag: 'open <ticket>', desc: 'Open window referencing a specific work order or ticket' },
      { flag: 'close', desc: 'Close window and lock protected paths' },
      { flag: 'status', desc: 'Check current window state (open / closed)' },
    ],
    example: 'npx cdal window open WO-104\n# edit contracts/*.contract.mjs\nnpx cdal window close',
  },
  {
    name: 'trace',
    summary: 'Verify requirement-to-test traceability matrix',
    usage: 'npx cdal trace [options]',
    description:
      'Scans test suites for // @REQ: <ID> markers and validates 100% coverage of active contract requirements.',
    options: [
      {
        flag: '--enforce',
        desc: 'Exits with code 1 if any requirement lacks automated test coverage',
      },
      { flag: '--markdown', desc: 'Outputs markdown table suitable for PR descriptions' },
      { flag: '--json', desc: 'Outputs trace coverage matrix as JSON' },
    ],
    example: 'npx cdal trace --enforce',
  },
  {
    name: 'phase',
    summary: 'Enforce CDAL loop phase gates from git diff',
    usage: 'npx cdal phase <contract|red|green> [options]',
    description:
      'Enforces phase boundaries across IDEs and CI: CONTRACT (only contracts modified), RED (only test files modified), GREEN (production code modified, zero test modifications).',
    options: [
      {
        flag: '--base <ref>',
        desc: 'Git reference or commit to diff against (default: origin/main or HEAD~1)',
      },
    ],
    example: 'npx cdal phase green --base origin/main',
  },
  {
    name: 'selftest',
    summary: 'Execute mutation testing on quality gates themselves',
    usage: 'npx cdal selftest [options]',
    description:
      'Tests whether validator invariants and guardrails actually fire red when violated. Proves gates are non-decorative.',
    options: [
      { flag: '--kinds <list>', desc: 'Filter specific kinds to probe' },
      { flag: '--verbose', desc: 'Show detailed mutation failure logs' },
    ],
    example: 'npx cdal selftest',
  },
  {
    name: 'sync',
    summary: 'Regenerate agent runtime configs from cdal.config.mjs',
    usage: 'npx cdal sync [options]',
    description:
      'Keeps .claude/settings.json, .agents/, and AGENTS.md synchronized with role definitions in cdal.config.mjs.',
    options: [
      {
        flag: '--check',
        desc: 'Drift detector: exits with code 1 if runtime files are out of sync',
      },
    ],
    example: 'npx cdal sync --check',
  },
  {
    name: 'verify',
    summary: 'Run full deterministic verification pipeline',
    usage: 'npx cdal verify [options]',
    description:
      'Executes the complete verification suite defined in cdal.config.mjs (validate, codegen --check, typecheck, lint, test, trace, selftest).',
    options: [
      { flag: '--fast', desc: 'Run essential fast checks only' },
      { flag: '--clean', desc: 'Clear build and test caches before verifying' },
    ],
    example: 'npx cdal verify',
  },
  {
    name: 'hook',
    summary: 'PreToolUse entrypoint for agent runtime hook routing',
    usage:
      'npx cdal hook <guard-paths|guard-forbidden|guard-bash|session-context|log-subagent> [role] [options]',
    description:
      'Reads tool execution payload from stdin. Validates write scopes (denyTests), forbidden patterns, and bash commands. Exits with code 2 to block tool execution.',
    options: [
      { flag: '--runtime <adapter>', desc: 'Runtime format: claude-code, antigravity, or generic' },
      { flag: '--config <path>', desc: 'Path to cdal.config.mjs' },
    ],
    example:
      'echo \'{"tool_name":"Edit","tool_input":{"file_path":"test.ts"}}\' | npx cdal hook guard-paths implementer',
  },
  {
    name: 'audit',
    summary: 'Scan repository for AI hygiene and export offline HTML report',
    usage: 'npx cdal audit [path] [options]',
    description:
      'Runs 8 static checks (< 20s) evaluating agent configuration, type silencing density, skipped tests, role separation, traceability, and secrets. Pure local execution, zero network requests.',
    options: [
      {
        flag: '--html <file>',
        desc: 'Path to write standalone offline HTML report (default: cdal-audit-report.html)',
      },
      { flag: '--json', desc: 'Output audit report in audit.v1 JSON schema' },
      { flag: '--lang <pl|en>', desc: 'Report language (default: pl)' },
    ],
    example: 'npx cdal audit --html ./report.html',
  },
  {
    name: 'doctor',
    summary: 'Diagnose CDAL installation and environment health',
    usage: 'npx cdal doctor',
    description:
      'Verifies Node.js version (>=20.9), git repository state, config validity, hook bindings, and detects configuration drift.',
    options: [],
    example: 'npx cdal doctor',
  },
];

function generateMarkdown() {
  const lines = [
    '---',
    'title: "CLI Reference"',
    'description: "Complete command-line reference for cdal CLI commands, flags, and options"',
    '---',
    '',
    '# CDAL CLI Reference (`cdal`)',
    '',
    '> **Note:** This documentation is generated deterministically from CLI command definitions. All commands are packaged in pure ESM and execute with zero runtime dependencies in `@cdal/core`.',
    '',
    '## Quick Command Matrix',
    '',
    '| Command | Summary | Key Options |',
    '|---|---|---|',
  ];

  for (const cmd of COMMANDS) {
    const opts =
      cmd.options.length > 0
        ? cmd.options.map((o) => `\`${o.flag.split(' ')[0]}\``).join(', ')
        : '—';
    lines.push(`| [\`cdal ${cmd.name}\`](#cdal-${cmd.name}) | ${cmd.summary} | ${opts} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  for (const cmd of COMMANDS) {
    lines.push(`## \`cdal ${cmd.name}\``);
    lines.push('');
    lines.push(`**${cmd.summary}**`);
    lines.push('');
    lines.push('```bash');
    lines.push(cmd.usage);
    lines.push('```');
    lines.push('');
    lines.push(cmd.description);
    lines.push('');

    if (cmd.options.length > 0) {
      lines.push('### Options');
      lines.push('');
      for (const opt of cmd.options) {
        lines.push(`- \`${opt.flag}\`: ${opt.desc}`);
      }
      lines.push('');
    }

    lines.push('### Example');
    lines.push('');
    lines.push('```bash');
    lines.push(cmd.example);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

const outputPath = path.resolve('content/docs/cli-reference.md');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generateMarkdown(), 'utf8');
console.log(`✅ Generated CLI reference at: ${outputPath}`);

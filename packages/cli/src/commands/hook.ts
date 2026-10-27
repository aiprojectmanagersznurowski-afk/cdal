import fs from 'node:fs';
import { type HookName, executeHook } from '@cdal/adapters';
import { loadConfig } from '@cdal/core';
import { defineCommand } from 'citty';

const VALID_HOOKS = new Set([
  'guard-paths',
  'guard-forbidden',
  'guard-bash',
  'session-context',
  'log-subagent',
]);

export const hookCommand = defineCommand({
  meta: {
    name: 'hook',
    description: 'Entrypoint for agent runtime hooks (Claude Code, Antigravity, etc.)',
  },
  args: {
    name: {
      type: 'positional',
      description:
        'Hook name to execute: guard-paths, guard-forbidden, guard-bash, session-context, log-subagent',
      required: true,
    },
    role: {
      type: 'positional',
      description: 'Fallback agent role name if not specified in hook payload',
      required: false,
    },
    runtime: {
      type: 'string',
      description: 'Target runtime adapter (claude-code, antigravity)',
      default: 'claude-code',
    },
    config: {
      type: 'string',
      description: 'Path to cdal.config.mjs',
    },
  },
  async run({ args }) {
    const hookName = args.name as HookName;
    if (!VALID_HOOKS.has(hookName)) {
      process.stderr.write(
        `Unknown hook name "${hookName}". Valid hooks: ${Array.from(VALID_HOOKS).join(', ')}\n`,
      );
      process.exit(1);
    }

    let rawPayload = '';
    try {
      rawPayload = fs.readFileSync(0, 'utf8');
    } catch {
      // stdin was not piped or not accessible
    }

    const cwd = process.cwd();
    const { config } = await loadConfig(args.config);

    const result = await executeHook(hookName, rawPayload, {
      cwd,
      config,
      fallbackRole: args.role,
      runtime: args.runtime as 'claude-code' | 'antigravity' | 'generic',
    });

    if (result.stdout) {
      process.stdout.write(`${result.stdout}\n`);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    process.exit(result.exitCode);
  },
});

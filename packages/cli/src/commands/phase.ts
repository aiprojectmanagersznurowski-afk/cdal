import { type PhaseType, checkPhase, loadConfig } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const phaseCommand = defineCommand({
  meta: {
    name: 'phase',
    description: 'Verify git diff against active loop phase (contract, red, green)',
  },
  args: {
    phase: {
      type: 'positional',
      description: 'Phase to verify: contract, red, green',
      required: true,
    },
    base: {
      type: 'string',
      description: 'Base git reference to compare against (e.g. main or origin/main)',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON payload',
      default: false,
    },
    config: {
      type: 'string',
      description: 'Path to cdal.config.mjs',
    },
  },
  async run({ args }) {
    const rawPhase = (args.phase || '').toLowerCase();
    if (!['contract', 'red', 'green'].includes(rawPhase)) {
      console.error(pc.red(`Invalid phase "${rawPhase}". Valid phases are: contract, red, green.`));
      process.exit(2);
    }
    const phase = rawPhase as PhaseType;

    const cwd = process.cwd();
    const { config: resolvedConfig } = await loadConfig(args.config);

    const result = checkPhase(phase, {
      cwd,
      base: args.base,
      protectedPaths: resolvedConfig?.protectedPaths,
    });

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    console.log(pc.bold(`\n  Phase: ${result.label}`));
    console.log(`  Modified files in diff: ${result.files.length}\n`);

    if (result.violations.length === 0) {
      if (result.files.length === 0) {
        if (phase === 'red') {
          console.log(
            pc.yellow(
              '  ⚠ No changes found in working tree. Phase RED requires at least one test.',
            ),
          );
          process.exit(1);
        }
        console.log(pc.dim('  No changes found in working tree.'));
        process.exit(0);
      }
      console.log(pc.green('  ✔ All changes are within active phase scopes.'));
      process.exit(0);
    }

    console.log(
      pc.red(`  ✗ ${result.violations.length} file(s) outside of permitted phase scope:\n`),
    );
    for (const v of result.violations) {
      console.log(`    - ${v}`);
    }
    console.log(pc.dim(`\n  ${result.why}\n`));
    process.exit(1);
  },
});

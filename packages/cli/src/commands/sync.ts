import { syncAdapters } from '@cdal/adapters';
import { loadConfig } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const syncCommand = defineCommand({
  meta: {
    name: 'sync',
    description:
      'Synchronize agent definitions, commands, hooks and rules across configured runtimes (with --check drift detection)',
  },
  args: {
    check: {
      type: 'boolean',
      description:
        'Check for drift between cdal.config.mjs and runtime files without modifying disk',
      default: false,
    },
    config: {
      type: 'string',
      description: 'Custom path to cdal.config.mjs',
    },
    cwd: {
      type: 'string',
      description: 'Working directory path',
    },
  },
  async run({ args }) {
    try {
      const cwd = args.cwd || process.cwd();
      const { config } = await loadConfig(args.config || cwd);

      const res = syncAdapters({
        cwd,
        config,
        check: Boolean(args.check),
      });

      if (args.check) {
        if (res.inSync) {
          console.log(
            pc.green(
              `✅ Sync check passed: all ${res.totalFiles} adapter file(s) are in sync across [${config.runtimes.join(', ')}].`,
            ),
          );
        } else {
          console.error(
            pc.red(
              `❌ Sync check failed: ${res.driftedFiles.length} adapter file(s) drifted from configuration:`,
            ),
          );
          for (const file of res.driftedFiles) {
            console.error(pc.red(`  - [DRIFT] ${file}`));
          }
          console.error(
            pc.yellow(
              '\nRun `npx cdalkit sync` to synchronize runtime files with cdal.config.mjs.',
            ),
          );
          process.exit(1);
        }
      } else {
        console.log(
          pc.green(
            `✅ Synchronized ${res.updatedFiles.length} adapter file(s) across [${config.runtimes.join(', ')}]:`,
          ),
        );
        for (const file of res.updatedFiles) {
          console.log(pc.cyan(`  - ${file}`));
        }
        if (res.updatedFiles.length === 0) {
          console.log(pc.dim('  (All files were already up-to-date)'));
        }
      }
      if (res.preservedFiles.length > 0) {
        console.log(
          pc.dim(
            `  ${res.preservedFiles.length} file(s) marked cdal:preserve were left untouched.`,
          ),
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`❌ Fatal error during sync: ${msg}`));
      process.exit(1);
    }
  },
});

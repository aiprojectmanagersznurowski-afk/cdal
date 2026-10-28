import { runCodegen } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';
import { resolveCommandKinds } from '../kinds.js';

export const codegenCommand = defineCommand({
  meta: {
    name: 'codegen',
    description:
      'Emit TypeScript types and documentation from contracts (with --check drift detection)',
  },
  args: {
    check: {
      type: 'boolean',
      description: 'Check for drift between contracts and generated files without modifying disk',
      default: false,
    },
    dir: {
      type: 'string',
      description: 'Custom path to contracts directory',
    },
  },
  async run({ args }) {
    try {
      const kinds = await resolveCommandKinds();

      const res = await runCodegen({
        contractsDir: args.dir,
        check: Boolean(args.check),
        kinds,
      });

      if (args.check) {
        if (!res.drift) {
          console.log(pc.green('✅ Codegen check: all generated files are in sync byte-for-byte.'));
        } else {
          console.error(pc.red('❌ Codegen check failed: drift detected in generated files:'));
          for (const f of res.files) {
            if (f.status === 'drift') {
              console.error(pc.red(`  - [DRIFT] ${f.path} (${f.fullPath})`));
            } else if (f.status === 'missing') {
              console.error(pc.red(`  - [MISSING] ${f.path} (${f.fullPath})`));
            }
          }
          console.error(
            pc.yellow('\nRun `cdal codegen` to synchronize generated files with contracts.'),
          );
          process.exit(1);
        }
      } else {
        console.log(pc.green(`✅ Emitted ${res.files.length} contract artifact(s):`));
        for (const f of res.files) {
          console.log(pc.cyan(`  - ${f.path} -> ${f.fullPath}`));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`❌ Fatal error during codegen: ${msg}`));
      process.exit(1);
    }
  },
});

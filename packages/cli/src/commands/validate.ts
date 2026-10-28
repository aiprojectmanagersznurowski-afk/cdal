import { formatFindingsText, runValidation } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';
import { resolveCommandKinds } from '../kinds.js';

export const validateCommand = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate contract invariants across all registered contract kinds',
  },
  args: {
    strict: {
      type: 'boolean',
      description: 'Treat warnings as failures (exit 1)',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output findings using machine-readable findings.v1 JSON schema',
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

      const report = await runValidation({
        contractsDir: args.dir,
        strict: Boolean(args.strict),
        kinds,
      });

      if (args.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        const text = formatFindingsText(report, Boolean(args.strict));
        if (report.valid) {
          console.log(pc.green(text));
        } else {
          console.error(pc.red(text));
        }
      }

      if (!report.valid) {
        process.exit(1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`❌ Fatal error during contract validation: ${msg}`));
      process.exit(1);
    }
  },
});

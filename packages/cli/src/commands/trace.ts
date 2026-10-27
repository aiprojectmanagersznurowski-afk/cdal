import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  type TraceRequirement,
  formatTraceMarkdown,
  formatTraceText,
  loadConfig,
  scanTrace,
} from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const traceCommand = defineCommand({
  meta: {
    name: 'trace',
    description: 'Inspect requirement-to-test traceability matrix (@REQ tags)',
  },
  args: {
    enforce: {
      type: 'boolean',
      description:
        'Exit with code 1 if any implementing/done requirement lacks tests, tests fail, or unknown @REQ tags exist',
      default: false,
    },
    markdown: {
      type: 'boolean',
      description: 'Output as Markdown table ready for pull request description',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output as structured JSON (trace.v1)',
      default: false,
    },
    results: {
      type: 'string',
      description: 'Path to test execution JSON results file (vitest or playwright json reporter)',
    },
    config: {
      type: 'string',
      description: 'Path to cdal.config.mjs',
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const { config: resolvedConfig } = await loadConfig(args.config);

    const contractsDir = resolvedConfig?.contractsDir ?? 'contracts';
    const reqContractPath = path.resolve(cwd, contractsDir, 'requirements.contract.mjs');

    let requirements: TraceRequirement[] = [];
    try {
      const imported = await import(pathToFileURL(reqContractPath).href);
      requirements = (imported.REQUIREMENTS ||
        imported.default?.REQUIREMENTS ||
        imported.default ||
        []) as TraceRequirement[];
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`Failed to load requirements from "${reqContractPath}": ${errorMsg}`));
      process.exit(1);
    }

    if (!Array.isArray(requirements) || requirements.length === 0) {
      console.warn(pc.yellow(`No requirements found in "${reqContractPath}".`));
      if (args.enforce) process.exit(1);
      return;
    }

    const report = scanTrace(requirements, {
      cwd,
      resultsFile: args.results,
    });

    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else if (args.markdown) {
      console.log(formatTraceMarkdown(report));
    } else {
      console.log(formatTraceText(report));
    }

    if (args.enforce && !report.ok) {
      process.exit(1);
    }
  },
});

import { loadConfig, runSelftest } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const selftestCommand = defineCommand({
  meta: {
    name: 'selftest',
    description: 'Run mutation testing on contract invariant rules and content guardrails',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON payload (selftest.v1)',
      default: false,
    },
    config: {
      type: 'string',
      description: 'Path to cdal.config.mjs',
    },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const { config: resolvedConfig } = await loadConfig(args.config);

    if (!args.json) {
      console.log(pc.bold(pc.cyan('\n  cdal selftest — mutation testing of quality gates')));
      console.log(
        pc.dim('  Testing whether validator and guardrails actually fire red when violated\n'),
      );
    }

    const report = await runSelftest({
      cwd,
      config: resolvedConfig,
    });

    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.ok ? 0 : 1);
    }

    // Display mutation results
    if (report.mutationResults.length > 0) {
      console.log(
        pc.bold(
          `  Contract Invariant Mutations (${report.mutationsPassed}/${report.mutationsTotal}):`,
        ),
      );
      for (const m of report.mutationResults) {
        if (m.passed) {
          console.log(
            `  ${pc.green('✔')} ${pc.cyan(m.rule.padEnd(26))} detected in ${pc.dim(m.file)}`,
          );
        } else {
          console.log(
            `  ${pc.red('✗')} ${pc.red(m.rule.padEnd(26))} ${pc.bold('MISSED')}: ${m.error ?? 'rule dead'}`,
          );
        }
      }
      console.log('');
    }

    // Display content probe results
    if (report.probeResults.length > 0) {
      console.log(
        pc.bold(`  Forbidden Content Probes (${report.probesPassed}/${report.probesTotal}):`),
      );
      for (const p of report.probeResults) {
        const action = p.fires ? 'detected' : 'allowed';
        if (p.passed) {
          console.log(
            `  ${pc.green('✔')} ${pc.cyan(p.rule.padEnd(30))} ${pc.green(action)}: ${p.desc}`,
          );
        } else {
          console.log(
            `  ${pc.red('✗')} ${pc.red(p.rule.padEnd(30))} ${pc.bold('FAILED')}: ${p.error ?? 'unexpected behavior'}`,
          );
        }
      }
      console.log('');
    }

    // Summary
    console.log(
      pc.bold(
        `  Summary: ${report.mutationsPassed}/${report.mutationsTotal} contract rules verified via mutation.`,
      ),
    );
    console.log(
      pc.bold(
        `           ${report.probesPassed}/${report.probesTotal} content guardrail probes verified.\n`,
      ),
    );

    if (report.failures.length > 0) {
      console.log(pc.bold(pc.red('  CRITICAL GATE FAILURES:')));
      for (const f of report.failures) {
        console.log(`    - ${pc.red(f)}`);
      }
      console.log('');
      process.exit(1);
    }

    console.log(pc.green(pc.bold('  ✔ Every quality gate rule is verified active and firing.\n')));
    process.exit(0);
  },
});

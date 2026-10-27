import { spawnSync } from 'node:child_process';
import { loadConfig } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const verifyCommand = defineCommand({
  meta: {
    name: 'verify',
    description: 'Run deterministic CDAL verification pipeline defined in configuration',
  },
  args: {
    fast: {
      type: 'boolean',
      description: 'Run fast subset of verification steps (contract checks & selftest)',
      default: false,
    },
    full: {
      type: 'boolean',
      description: 'Force execution of all verification steps',
      default: false,
    },
    clean: {
      type: 'boolean',
      description: 'Clear temporary caches before running verification',
      default: false,
    },
    config: {
      type: 'string',
      description: 'Path to cdal.config.mjs',
    },
    cwd: {
      type: 'string',
      description: 'Working directory path',
    },
  },
  async run({ args }) {
    const cwd = args.cwd || process.cwd();
    const { config } = await loadConfig(args.config || cwd);

    let steps = [...config.verify];

    if (args.fast) {
      // In fast mode, run contract validation, codegen drift check, and selftest
      steps = steps.filter(
        (s) =>
          s.includes('validate') ||
          s.includes('codegen') ||
          s.includes('selftest') ||
          s.includes('typecheck'),
      );
      if (steps.length === 0) {
        steps = [config.verify[0] ?? 'cdal validate --strict'];
      }
    }

    console.log(
      pc.bold(pc.cyan(`\n⚡ Running CDAL Verification Pipeline (${steps.length} step(s))...\n`)),
    );

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      console.log(pc.bold(pc.blue(`[${i + 1}/${steps.length}] ▶ ${step}`)));

      const start = Date.now();
      const res = spawnSync(step, {
        cwd,
        shell: true,
        stdio: 'inherit',
      });
      const duration = Date.now() - start;

      if (res.status !== 0) {
        console.error(
          pc.bold(
            pc.red(
              `\n❌ Verification failed at step: "${step}" (exit code ${res.status ?? 1}, took ${duration}ms)`,
            ),
          ),
        );
        process.exit(res.status ?? 1);
      }

      console.log(pc.green(`  ✓ Step passed in ${duration}ms\n`));
    }

    console.log(
      pc.bold(
        pc.green(`✅ Full verification pipeline succeeded (${steps.length} step(s) passed).`),
      ),
    );
  },
});

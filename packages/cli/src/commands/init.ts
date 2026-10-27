import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncAdapters } from '@cdal/adapters';
import { resolveConfig } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description:
      'Initialize CDAL quality gates, starter contracts, and runtime adapters in the repository',
  },
  args: {
    yes: {
      type: 'boolean',
      description: 'Accept default recommendations non-interactively',
      alias: 'y',
      default: false,
    },
    preset: {
      type: 'string',
      description: 'Preset configuration to apply (e.g. typescript-strict, nextjs, node-service)',
      default: 'typescript-strict',
    },
    runtime: {
      type: 'string',
      description: 'Comma-separated runtimes to enable (claude-code, agents-md, antigravity)',
      default: 'claude-code,agents-md',
    },
    cwd: {
      type: 'string',
      description: 'Target directory to initialize',
    },
  },
  async run({ args }) {
    const cwd = args.cwd || process.cwd();
    console.log(pc.bold(pc.cyan('\n🚀 Initializing Contract-Driven Agentic Loop (CDAL)...\n')));

    const preset = args.preset || 'typescript-strict';
    const rawRuntimes = (args.runtime || 'claude-code,agents-md')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    // 1. Create contracts directory and sample contract if missing
    const contractsDir = join(cwd, 'contracts');
    if (!existsSync(contractsDir)) {
      mkdirSync(contractsDir, { recursive: true });
    }

    const sampleContractPath = join(contractsDir, 'requirements.contract.mjs');
    if (!existsSync(sampleContractPath)) {
      const sampleContractContent = `// @origin: cdal init
export const REQUIREMENTS = [
  {
    id: 'REQ-CORE-INIT-1',
    statement: 'System must initialize workspace with contract-driven quality gates.',
    acceptance: [
      'cdal validate succeeds without errors',
      'Test cases are marked with @REQ tags',
    ],
    status: 'ACTIVE',
    priority: 'CRITICAL',
  },
];
`;
      writeFileSync(sampleContractPath, sampleContractContent, 'utf8');
      console.log(
        pc.green(`  ✓ Created starter contract: ${pc.bold('contracts/requirements.contract.mjs')}`),
      );
    }

    // 2. Create cdal.config.mjs if missing
    const configPath = join(cwd, 'cdal.config.mjs');
    if (!existsSync(configPath)) {
      const runtimesFormatted = rawRuntimes.map((r) => `'${r}'`).join(', ');
      const configContent = `import { defineConfig } from '@cdal/core';
import { policies, requirements, stateMachine } from '@cdal/kinds';

export default defineConfig({
  contractsDir: 'contracts',
  generated: {
    ts: 'src/generated/contracts',
    docs: 'docs/generated',
  },
  kinds: [requirements(), stateMachine(), policies()],
  presets: ['${preset}'],
  runtimes: [${runtimesFormatted}],
  verify: [
    'cdal validate --strict',
    'cdal codegen --check',
    'cdal trace --enforce',
    'cdal selftest',
  ],
});
`;
      writeFileSync(configPath, configContent, 'utf8');
      console.log(pc.green(`  ✓ Created configuration: ${pc.bold('cdal.config.mjs')}`));
    } else {
      console.log(
        pc.dim('  ℹ cdal.config.mjs already exists (preserving existing configuration).'),
      );
    }

    // 3. Update package.json scripts if package.json exists
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkgRaw = readFileSync(pkgPath, 'utf8');
        const pkg = JSON.parse(pkgRaw);
        pkg.scripts = pkg.scripts || {};
        let updated = false;

        if (!pkg.scripts.verify) {
          pkg.scripts.verify = 'cdal verify';
          updated = true;
        }
        if (!pkg.scripts.selftest) {
          pkg.scripts.selftest = 'cdal selftest';
          updated = true;
        }
        if (!pkg.scripts.trace) {
          pkg.scripts.trace = 'cdal trace';
          updated = true;
        }

        if (updated) {
          writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
          console.log(
            pc.green(`  ✓ Added verify/selftest/trace scripts to ${pc.bold('package.json')}`),
          );
        }
      } catch {
        console.log(pc.yellow('  ⚠️  Could not update package.json scripts automatically.'));
      }
    }

    // 4. Synchronize adapter files across selected runtimes
    const resolvedConfig = resolveConfig({
      presets: [preset],
      runtimes: rawRuntimes,
    });

    const syncRes = syncAdapters({
      cwd,
      config: resolvedConfig,
      check: false,
    });

    console.log(
      pc.green(
        `  ✓ Generated ${syncRes.updatedFiles.length} runtime adapter file(s) across [${rawRuntimes.join(', ')}].`,
      ),
    );

    console.log(pc.bold(pc.green('\n🎉 CDAL initialized successfully!')));
    console.log(pc.cyan('Next steps:'));
    console.log(pc.dim('  1. Review contracts in contracts/*.contract.mjs'));
    console.log(pc.dim('  2. Run `npx cdal doctor` to verify environment health'));
    console.log(pc.dim('  3. Run `npx cdal verify` to test the loop gate\n'));
  },
});

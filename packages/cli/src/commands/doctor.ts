import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncAdapters } from '@cdal/adapters';
import { type ContractKind, type ResolvedCdalConfig, loadConfig, runCodegen } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export interface DoctorCheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  recommendation?: string;
}

/**
 * Claude Code only runs hooks declared as matcher groups with typed handlers:
 * { matcher, hooks: [{ type: 'command', command }] }. A `command` placed
 * directly on the group is silently ignored.
 */
function inspectClaudeHooks(settings: {
  hooks?: Record<string, unknown>;
}): 'ok' | 'legacy-format' | 'missing' {
  const groups = settings.hooks?.PreToolUse;
  if (!Array.isArray(groups)) return 'missing';
  let legacy = false;
  for (const group of groups as Array<Record<string, unknown>>) {
    if (typeof group.command === 'string' && /cdal(kit)? hook/.test(group.command)) legacy = true;
    const handlers = Array.isArray(group.hooks)
      ? (group.hooks as Array<Record<string, unknown>>)
      : [];
    for (const handler of handlers) {
      if (
        handler.type === 'command' &&
        typeof handler.command === 'string' &&
        /cdal(kit)? hook guard-paths/.test(handler.command)
      ) {
        return 'ok';
      }
    }
  }
  return legacy ? 'legacy-format' : 'missing';
}

export function runDoctorChecks(
  cwd: string,
  customConfig?: string,
): {
  checks: DoctorCheckResult[];
  healthy: boolean;
} {
  const checks: DoctorCheckResult[] = [];

  // 1. Node version check (requires >= 20.9.0)
  const nodeVer = process.version;
  const match = /^v(\d+)\.(\d+)\./.exec(nodeVer);
  const major = match?.[1] ? Number.parseInt(match[1], 10) : 0;
  const minor = match?.[2] ? Number.parseInt(match[2], 10) : 0;

  if (major > 20 || (major === 20 && minor >= 9)) {
    checks.push({
      name: 'Node.js Runtime',
      status: 'ok',
      message: `Node ${nodeVer} satisfies engines.node >= 20.9.0 LTS`,
    });
  } else {
    checks.push({
      name: 'Node.js Runtime',
      status: 'error',
      message: `Current Node ${nodeVer} is below required >= 20.9.0`,
      recommendation: 'Upgrade Node.js to Node 22 LTS or Node 20.9+.',
    });
  }

  // 2. Git installation and repository check
  const gitVersionRes = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (gitVersionRes.status !== 0) {
    checks.push({
      name: 'Git Binary',
      status: 'error',
      message: 'git binary is not available in PATH',
      recommendation: 'Install Git or add it to PATH.',
    });
  } else {
    checks.push({
      name: 'Git Binary',
      status: 'ok',
      message: `Git is available (${gitVersionRes.stdout.trim()})`,
    });

    const gitRepoRes = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd,
      encoding: 'utf8',
    });
    if (gitRepoRes.status !== 0) {
      checks.push({
        name: 'Git Repository',
        status: 'error',
        message: 'Current directory is not inside a git working tree',
        recommendation: 'Initialize git with `git init`.',
      });
    } else {
      checks.push({
        name: 'Git Repository',
        status: 'ok',
        message: 'Inside active git working tree',
      });
    }
  }

  // 3. Configuration check
  let configObj: ResolvedCdalConfig | null = null;
  try {
    const loaded = loadConfigSync(cwd, customConfig);
    configObj = loaded.config;
    checks.push({
      name: 'Configuration',
      status: 'ok',
      message: `Configuration loaded cleanly (${loaded.filepath ? loaded.filepath : 'default config'})`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({
      name: 'Configuration',
      status: 'error',
      message: `Failed to load cdal.config.mjs: ${msg}`,
      recommendation: 'Run `cdal init` or fix configuration errors.',
    });
  }

  // 4. Hook wiring check in .claude/settings.json
  const settingsPath = join(cwd, '.claude/settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
        hooks?: Record<string, unknown>;
      };
      const wiring = inspectClaudeHooks(settings);
      if (wiring === 'ok') {
        checks.push({
          name: 'Claude Code Hooks',
          status: 'ok',
          message: '.claude/settings.json correctly wires CDAL pre-tool hooks',
        });
      } else {
        checks.push({
          name: 'Claude Code Hooks',
          status: 'warn',
          message:
            wiring === 'legacy-format'
              ? '.claude/settings.json uses a hook format Claude Code ignores, so the CDAL gates never run'
              : '.claude/settings.json exists but does not wire the CDAL guard-paths hook',
          recommendation: 'Run `npx cdalkit sync` to regenerate the hook wiring.',
        });
      }
    } catch {
      checks.push({
        name: 'Claude Code Hooks',
        status: 'warn',
        message: 'Could not read .claude/settings.json',
      });
    }
  } else {
    checks.push({
      name: 'Claude Code Hooks',
      status: 'warn',
      message: 'No .claude/settings.json found in workspace',
      recommendation: 'Run `cdal init` or `cdal sync` to generate hook wiring.',
    });
  }

  // 5. Adapter drift check
  if (configObj) {
    try {
      const syncRes = syncAdapters({ cwd, config: configObj, check: true });
      if (syncRes.inSync) {
        checks.push({
          name: 'Runtime Adapters Sync',
          status: 'ok',
          message: `All ${syncRes.totalFiles} adapter file(s) are in sync without drift`,
        });
      } else {
        checks.push({
          name: 'Runtime Adapters Sync',
          status: 'error',
          message: `${syncRes.driftedFiles.length} adapter file(s) drifted from configuration: ${syncRes.driftedFiles.join(', ')}`,
          recommendation: 'Run `cdal sync` to synchronize runtime files.',
        });
      }
    } catch (err: unknown) {
      checks.push({
        name: 'Runtime Adapters Sync',
        status: 'warn',
        message: `Could not check adapter sync: ${String(err)}`,
      });
    }
  }

  const healthy = checks.every((c) => c.status !== 'error');
  return { checks, healthy };
}

function loadConfigSync(cwd: string, customConfig?: string) {
  const configPath = customConfig || join(cwd, 'cdal.config.mjs');
  if (existsSync(configPath)) {
    return { config: null, filepath: configPath };
  }
  return { config: null, filepath: null };
}

export const doctorCommand = defineCommand({
  meta: {
    name: 'doctor',
    description:
      'Diagnose CDAL installation, environment health, hook wiring, and configuration drift',
  },
  args: {
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
    console.log(pc.bold(pc.cyan('\n🩺 Running CDAL Diagnostic Doctor...\n')));

    let resolvedConfig: ResolvedCdalConfig | null = null;
    try {
      const loaded = await loadConfig(args.config || cwd);
      resolvedConfig = loaded.config;
    } catch (err: unknown) {
      console.error(pc.red(`⚠️  Configuration error: ${String(err)}`));
    }

    const { checks, healthy } = runDoctorChecks(cwd, args.config);

    // If we loaded config, also test runCodegen drift
    if (resolvedConfig) {
      try {
        const codegenRes = await runCodegen({
          contractsDir: resolvedConfig.contractsDir,
          kinds: resolvedConfig.kinds as unknown as ContractKind<unknown>[],
          check: true,
        });
        if (!codegenRes.drift) {
          checks.push({
            name: 'Contract Codegen Sync',
            status: 'ok',
            message: 'Generated contract artifacts match contracts byte-for-byte',
          });
        } else {
          checks.push({
            name: 'Contract Codegen Sync',
            status: 'error',
            message: 'Generated contract code drifted from contract sources',
            recommendation: 'Run `cdal codegen` to regenerate artifacts.',
          });
        }
      } catch {
        // ignore codegen errors in doctor if contractsDir empty
      }
    }

    for (const check of checks) {
      if (check.status === 'ok') {
        console.log(pc.green(`  ✓ [OK] ${pc.bold(check.name)}: ${check.message}`));
      } else if (check.status === 'warn') {
        console.log(pc.yellow(`  ⚠️  [WARN] ${pc.bold(check.name)}: ${check.message}`));
        if (check.recommendation) {
          console.log(pc.dim(`      Recommendation: ${check.recommendation}`));
        }
      } else {
        console.log(pc.red(`  ❌ [FAIL] ${pc.bold(check.name)}: ${check.message}`));
        if (check.recommendation) {
          console.log(pc.yellow(`      Recommendation: ${check.recommendation}`));
        }
      }
    }

    if (healthy) {
      console.log(
        pc.bold(pc.green('\n✅ Doctor report: Environment and CDAL quality gates are healthy!\n')),
      );
    } else {
      console.log(pc.bold(pc.red('\n❌ Doctor report: Some critical diagnostic checks failed.\n')));
      process.exit(1);
    }
  },
});

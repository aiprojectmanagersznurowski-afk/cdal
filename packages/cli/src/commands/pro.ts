import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';
import { ProInstallError, installPro } from '../pro/install.js';

export const PRO_REPOSITORY_URL = 'https://github.com/aiprojectmanagersznurowski-afk/cdal-pro.git';

/** Clones a git source into a temp directory; local directories are used as-is. */
function resolveSource(from: string): { dir: string; cleanup: () => void } {
  const local = resolve(from);
  if (existsSync(local)) return { dir: local, cleanup: () => {} };

  const dir = mkdtempSync(join(tmpdir(), 'cdal-pro-'));
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  try {
    execFileSync('git', ['clone', '--depth', '1', '--quiet', from, dir], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch {
    cleanup();
    throw new ProInstallError(
      `Could not clone ${from}.\n  CDAL Pro is delivered as a private GitHub repository: accept the invitation sent after your purchase, make sure git can access GitHub as that account, then run this command again.`,
    );
  }
  return { dir, cleanup };
}

const installCommand = defineCommand({
  meta: {
    name: 'install',
    description: 'Install CDAL Pro content (agent roles, templates, presets) into this project',
  },
  args: {
    from: {
      type: 'string',
      description: 'Local copy or git URL of the cdal-pro repository',
      default: PRO_REPOSITORY_URL,
    },
    cwd: {
      type: 'string',
      description: 'Project directory to install into',
      default: '.',
    },
    force: {
      type: 'boolean',
      description: 'Overwrite files that already exist in the project',
      default: false,
    },
    dryRun: {
      type: 'boolean',
      description: 'Show what would be installed without writing anything',
      default: false,
    },
  },
  run({ args }) {
    let source: { dir: string; cleanup: () => void } | undefined;
    try {
      source = resolveSource(args.from);
      const result = installPro({
        sourceDir: source.dir,
        targetDir: resolve(args.cwd),
        force: args.force,
        dryRun: args.dryRun,
      });

      const verb = args.dryRun ? 'Would install' : 'Installed';
      console.log(pc.green(`✔ ${verb} ${result.name} ${result.version}`));
      console.log(`  ${result.written.length} file(s) ${args.dryRun ? 'to write' : 'written'}`);
      if (result.skipped.length > 0) {
        console.log(
          pc.yellow(
            `  ${result.skipped.length} existing file(s) kept — rerun with --force to overwrite:`,
          ),
        );
        for (const file of result.skipped) console.log(pc.dim(`    ${file}`));
      }
      if (!args.dryRun) {
        console.log(pc.dim('  Run `npx cdalkit sync` to wire the new roles into your runtimes.'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(pc.red(`✖ ${message}`));
      process.exit(1);
    } finally {
      source?.cleanup();
    }
  },
});

export const proCommand = defineCommand({
  meta: {
    name: 'pro',
    description: 'CDAL Pro: install licensed agent roles, templates and presets',
  },
  subCommands: {
    install: installCommand,
  },
});

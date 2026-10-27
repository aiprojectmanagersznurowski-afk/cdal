import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHtmlReport, renderTerminalReport, runAudit } from '@cdal/audit';
import type { AuditLanguage } from '@cdal/audit';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const auditCommand = defineCommand({
  meta: {
    name: 'audit',
    description:
      'Audit repository for AI agent hygiene, type silencing, test isolation and gates (100% offline)',
  },
  args: {
    path: {
      type: 'positional',
      description: 'Path to repository root to audit',
      required: false,
      default: '.',
    },
    html: {
      type: 'string',
      description: 'Path to save standalone single-file HTML report (e.g. audit-report.html)',
      required: false,
    },
    json: {
      type: 'boolean',
      description: 'Output machine-readable JSON report (schema: audit.v1)',
      default: false,
    },
    lang: {
      type: 'string',
      description: 'Report language (en or pl)',
      default: 'en',
    },
    failUnder: {
      type: 'string',
      description: 'Exit with code 1 if audit score is below this threshold (0-100)',
      required: false,
    },
  },
  async run({ args }) {
    const targetDir = resolve(args.path || '.');
    const lang = (args.lang === 'pl' ? 'pl' : 'en') as AuditLanguage;

    if (!args.json) {
      console.log(pc.bold(pc.cyan('\n🔍 Running CDAL Repository AI Hygiene Audit...\n')));
    }

    const report = await runAudit({
      cwd: targetDir,
      lang,
    });

    if (args.html) {
      const htmlContent = renderHtmlReport(report, lang);
      const outPath = resolve(args.html);
      writeFileSync(outPath, htmlContent, 'utf8');
      if (!args.json) {
        console.log(pc.green(`  ✔ Wygenerowano raport HTML: ${outPath}`));
      }
    }

    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(renderTerminalReport(report, lang));
    }

    if (args.failUnder) {
      const threshold = Number.parseInt(args.failUnder, 10);
      if (!Number.isNaN(threshold) && report.score < threshold) {
        console.error(
          pc.red(
            `\n❌ Audit score ${report.score} is below threshold ${threshold}. Failing quality gate.`,
          ),
        );
        process.exit(1);
      }
    }
  },
});

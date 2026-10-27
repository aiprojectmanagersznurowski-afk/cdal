import { loadConfig } from '../config/loader.js';
import { ContractRegistry } from '../kinds/registry.js';
import type { ContractKind, Finding } from '../kinds/types.js';
import type { FindingsReportV1, ValidateOptions } from './types.js';

export function createFindingsReport(findings: Finding[], strict = false): FindingsReportV1 {
  let errors = 0;
  let warnings = 0;

  for (const f of findings) {
    if (f.severity === 'error') {
      errors++;
    } else if (f.severity === 'warn') {
      warnings++;
    }
  }

  const valid = strict ? errors === 0 && warnings === 0 : errors === 0;

  return {
    version: 'findings.v1',
    valid,
    stats: {
      errors,
      warnings,
      total: findings.length,
    },
    findings,
  };
}

export async function runValidation(
  options: ValidateOptions & { kinds?: ContractKind[]; registry?: ContractRegistry } = {},
): Promise<FindingsReportV1> {
  const cwd = options.cwd ?? process.cwd();
  const config = options.config ?? (await loadConfig(cwd)).config;

  const contractsDir = options.contractsDir ?? config.contractsDir;
  const strict = options.strict ?? false;

  let registry = options.registry;
  if (!registry) {
    registry = new ContractRegistry();
    if (options.kinds && options.kinds.length > 0) {
      for (const k of options.kinds) {
        registry.register(k);
      }
    } else if (config.kinds && config.kinds.length > 0) {
      for (const k of config.kinds) {
        // If kind definition from config matches ContractKind shape
        if (typeof (k as unknown as ContractKind).load === 'function') {
          registry.register(k as unknown as ContractKind);
        }
      }
    }
  }

  const findings = await registry.validate(contractsDir, cwd);
  return createFindingsReport(findings, strict);
}

export function formatFindingsText(report: FindingsReportV1, strict = false): string {
  const lines: string[] = [];

  if (report.findings.length === 0) {
    lines.push('✅ All contract invariants passed without findings.');
    return lines.join('\n');
  }

  lines.push(`Found ${report.findings.length} contract finding(s):\n`);

  for (const f of report.findings) {
    const icon = f.severity === 'error' ? '❌' : '⚠️ ';
    const loc = f.file ? ` [${f.file}${f.line ? `:${f.line}` : ''}]` : '';
    lines.push(`${icon} (${f.ruleId})${loc}: ${f.message}`);
  }

  lines.push('\nSummary:');
  lines.push(`  Errors: ${report.stats.errors}`);
  lines.push(`  Warnings: ${report.stats.warnings}`);
  lines.push(`  Result: ${report.valid ? 'PASSED' : 'FAILED'}${strict ? ' (strict mode)' : ''}`);

  return lines.join('\n');
}

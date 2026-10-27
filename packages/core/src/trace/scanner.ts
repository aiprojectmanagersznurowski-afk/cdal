import fs from 'node:fs';
import path from 'node:path';
import { isTestPath } from '../guard/guard.js';
import type {
  RunTraceOptions,
  TestMatch,
  TraceReport,
  TraceRequirement,
  TraceRow,
  TraceVerdict,
  UnknownTag,
} from './types.js';

const DEFAULT_SEARCH_ROOTS = ['test', 'tests', 'e2e', 'apps', 'packages', 'examples', 'src'];
const TEST_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.sql']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.turbo',
  '.git',
  'generated',
  '.cdal',
]);

const REQ_TAG_PATTERN = /@REQ:\s*([A-Za-z0-9_\-]+(?:\s*,\s*[A-Za-z0-9_\-]+)*)/g;

export function walkTestFiles(dir: string, out: string[] = [], rootCwd: string = dir): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    let st: fs.Stats;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }

    if (st.isDirectory()) {
      // Do not descend into child workspaces with their own cdal.config.mjs
      if (
        path.resolve(full) !== path.resolve(rootCwd) &&
        (fs.existsSync(path.join(full, 'cdal.config.mjs')) ||
          fs.existsSync(path.join(full, 'cdal.config.js')))
      ) {
        continue;
      }
      walkTestFiles(full, out, rootCwd);
    } else if (TEST_EXTENSIONS.has(path.extname(full)) && isTestPath(full)) {
      out.push(full);
    }
  }

  return out;
}

export function parseTestResults(resultsFilePath: string, cwd: string): Set<string> {
  const failingFiles = new Set<string>();
  if (!fs.existsSync(resultsFilePath)) {
    return failingFiles;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(resultsFilePath, 'utf8'));
    const collect = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) collect(item);
        return;
      }
      const obj = node as Record<string, unknown>;
      if (obj.status === 'failed' || obj.outcome === 'unexpected') {
        const f = (obj.file ||
          obj.name ||
          (obj.location as Record<string, unknown> | undefined)?.file) as string | undefined;
        if (f) {
          const abs = path.isAbsolute(f) ? f : path.resolve(cwd, f);
          failingFiles.add(path.relative(cwd, abs).replace(/\\/g, '/'));
        }
      }
      for (const val of Object.values(obj)) {
        if (val && typeof val === 'object') {
          collect(val);
        }
      }
    };
    collect(raw);
  } catch {
    // Gracefully handle malformed test result files
  }

  return failingFiles;
}

export function scanTrace(
  requirements: TraceRequirement[],
  options: RunTraceOptions = {},
): TraceReport {
  const cwd = options.cwd ?? process.cwd();
  const searchRoots = options.searchRoots ?? DEFAULT_SEARCH_ROOTS;
  const coverage = new Map<string, TestMatch[]>();
  const unknownTags: UnknownTag[] = [];
  const reqIdMap = new Map<string, TraceRequirement>();

  for (const req of requirements) {
    reqIdMap.set(req.id, req);
  }

  for (const rootDir of searchRoots) {
    const absDir = path.resolve(cwd, rootDir);
    if (!fs.existsSync(absDir)) continue;

    for (const filePath of walkTestFiles(absDir, [], cwd)) {
      const relFile = path.relative(cwd, filePath).replace(/\\/g, '/');
      let content = '';
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        for (const match of line.matchAll(REQ_TAG_PATTERN)) {
          const matchedGroup = match[1] ?? '';
          const tagIds = matchedGroup
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

          for (const reqId of tagIds) {
            const nextLine = (lines[i + 1] ?? '').trim().slice(0, 80);
            if (!reqIdMap.has(reqId)) {
              unknownTags.push({
                id: reqId,
                file: relFile,
                line: i + 1,
              });
              continue;
            }

            if (!coverage.has(reqId)) {
              coverage.set(reqId, []);
            }
            coverage.get(reqId)?.push({
              file: relFile,
              line: i + 1,
              title: nextLine,
            });
          }
        }
      }
    }
  }

  const failingFiles = options.resultsFile
    ? parseTestResults(path.resolve(cwd, options.resultsFile), cwd)
    : new Set<string>();

  const rows: TraceRow[] = requirements.map((req) => {
    const tests = coverage.get(req.id) ?? [];
    const failing = tests.filter((t) => failingFiles.has(t.file));

    let verdict: TraceVerdict;
    if (tests.length === 0) {
      verdict = 'NO TEST';
    } else if (failing.length > 0) {
      verdict = 'TEST FAILING';
    } else if (options.resultsFile) {
      verdict = 'COVERED ✓';
    } else {
      verdict = 'COVERED (no results)';
    }

    return {
      ...req,
      tests,
      failing,
      verdict,
    };
  });

  const violations = rows.filter(
    (r) =>
      (['IMPLEMENTING', 'DONE'].includes(r.status) && r.tests.length === 0) || r.failing.length > 0,
  );

  const highRiskUncovered = rows.filter(
    (r) => r.risk === 'HIGH' && r.tests.length === 0 && r.status !== 'BLOCKED',
  );

  const total = rows.length;
  const covered = rows.filter((r) => r.tests.length > 0).length;
  const coveragePercent = total > 0 ? Math.round((covered / total) * 100) : 100;
  const ok = violations.length === 0 && unknownTags.length === 0;

  return {
    schemaVersion: 'trace.v1',
    timestamp: new Date().toISOString(),
    total,
    covered,
    coveragePercent,
    rows,
    violations,
    highRiskUncovered,
    unknownTags,
    ok,
  };
}

export function formatTraceMarkdown(report: TraceReport): string {
  const lines: string[] = [];
  lines.push('| Requirement | Domain | Risk | Status | Tests | Verdict |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of report.rows) {
    lines.push(
      `| \`${r.id}\` | ${r.domain} | ${r.risk} | ${r.status} | ${r.tests.length} | ${r.verdict} |`,
    );
  }
  lines.push('');
  lines.push(
    `**Coverage**: ${report.covered}/${report.total} requirements covered (${report.coveragePercent}%).`,
  );
  if (report.violations.length > 0) {
    lines.push('');
    lines.push(
      `> [!WARNING]\n> **${report.violations.length} gate violation(s)** detected in requirements trace.`,
    );
  }
  return lines.join('\n');
}

export function formatTraceText(report: TraceReport): string {
  const lines: string[] = [];
  const byDomain: Record<string, TraceRow[]> = {};
  for (const r of report.rows) {
    const domainList = byDomain[r.domain] ?? [];
    domainList.push(r);
    byDomain[r.domain] = domainList;
  }

  lines.push('\n  cdal trace — requirement to test traceability matrix\n');
  for (const [domain, list] of Object.entries(byDomain)) {
    const covered = list.filter((r) => r.tests.length > 0).length;
    lines.push(
      `  ${domain.padEnd(16)} ${String(covered).padStart(3)}/${String(list.length).padEnd(3)} covered`,
    );
    for (const r of list) {
      if (r.status === 'TODO' && r.tests.length === 0) continue;
      const mark = r.failing.length > 0 ? '✗' : r.tests.length > 0 ? '✓' : '·';
      const testFiles = r.tests.map((t) => t.file).join(', ') || '—';
      lines.push(`    ${mark} ${r.id.padEnd(30)} ${r.status.padEnd(13)} ${testFiles}`);
    }
  }

  lines.push(
    `\n  Total: ${report.covered}/${report.total} requirements have test coverage (${report.coveragePercent}%).`,
  );

  if (report.unknownTags.length > 0) {
    lines.push('\n  ⚠ Unknown @REQ tags detected (typo or invented ID):');
    for (const u of report.unknownTags) {
      lines.push(`    - ${u.id} in ${u.file}:${u.line}`);
    }
  }

  if (report.highRiskUncovered.length > 0) {
    lines.push('\n  ⚠ HIGH RISK requirements without any test coverage:');
    for (const r of report.highRiskUncovered) {
      lines.push(`    - ${r.id}: ${r.statement.slice(0, 90)}`);
    }
  }

  if (report.violations.length > 0) {
    lines.push('\n  ✗ GATE VIOLATIONS:');
    for (const v of report.violations) {
      lines.push(
        `    - ${v.id}: ${v.failing.length > 0 ? 'test failing' : `status ${v.status} without test`}`,
      );
    }
  }

  return lines.join('\n');
}

import type { AuditLanguage, AuditReport } from './types.js';

const LABELS = {
  en: {
    title: 'AI Agent Quality & Hygiene Report',
    directory: 'Directory',
    time: 'Time',
    files: 'Files',
    filesUnit: 'files',
    in: 'in',
    score: 'SCORE',
    points: 'pts',
    gates: 'Gates',
    passed: 'passed',
    checks: 'Quality checks (§5.6):',
    recommendations: 'Remediation steps:',
    command: 'Command',
    manual: 'Vibecoding Manual (set up Cursor/Windsurf/Antigravity in 60s):',
  },
  pl: {
    title: 'Raport Higieny Agentów AI',
    directory: 'Katalog',
    time: 'Czas',
    files: 'Pliki',
    filesUnit: 'plików',
    in: 'w',
    score: 'WYNIK',
    points: 'pkt',
    gates: 'Bramki',
    passed: 'zaliczonych',
    checks: 'Sprawdzenia jakości (§5.6):',
    recommendations: 'Rekomendacje naprawcze:',
    command: 'Komenda',
    manual: 'Manual Vibecodingu (konfiguracja Cursora/Windsurfa/Antigravity w 60s):',
  },
} as const;

export function renderTerminalReport(report: AuditReport, lang: AuditLanguage = 'en'): string {
  const l = LABELS[lang];

  const lines: string[] = [];

  lines.push('');
  lines.push('  ──────────────────────────────────────────────────────────────');
  lines.push(`  🔍  CDAL Audit — ${l.title}`);
  lines.push('  ──────────────────────────────────────────────────────────────');
  lines.push(`  ${`${l.directory}:`.padEnd(8, ' ')} ${report.targetPath}`);
  lines.push(`  ${`${l.time}:`.padEnd(8, ' ')} ${report.timestamp}`);
  lines.push(
    `  ${`${l.files}:`.padEnd(8, ' ')} ${report.stats.totalFiles} ${l.filesUnit} (${report.stats.totalLinesOfCode} LOC) ${l.in} ${report.stats.durationMs}ms`,
  );
  lines.push('');

  // Score display
  const scoreBadge = `[ ${report.score} / 100 ${l.points} ]`;
  lines.push(`  ${l.score}: ${scoreBadge} — ${report.band.toUpperCase()}`);
  lines.push(`  ${l.gates}: ${report.summary.passed}/${report.summary.total} ${l.passed}`);
  lines.push('');

  lines.push(`  ${l.checks}`);
  for (const check of report.checks) {
    const symbol = check.passed ? '✔' : '✖';
    const scoreStr = `${check.score}/${check.maxScore} ${l.points}`.padStart(11, ' ');
    lines.push(`  ${symbol} ${check.name.padEnd(52, ' ')} ${scoreStr}`);
    if (!check.passed && check.details) {
      lines.push(`    ↳ ${check.details}`);
    }
  }

  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push(`  ${l.recommendations}`);
    for (const rec of report.recommendations) {
      lines.push(`  • [${rec.priority.toUpperCase()}] ${rec.title}`);
      lines.push(`    ${rec.description}`);
      if (rec.remediationSnippet) {
        lines.push(`    ${l.command}: ${rec.remediationSnippet}`);
      }
      lines.push(`    Docs: ${rec.docsUrl}`);
    }
  }

  const manualUrl = `https://cdal-henna.vercel.app/manual?utm_source=audit&utm_medium=report&utm_content=${report.band}&score=${report.score}`;
  lines.push('');
  lines.push('  ──────────────────────────────────────────────────────────────');
  lines.push(`  🚀  ${l.manual}`);
  lines.push(`      ${manualUrl}`);
  lines.push('  ──────────────────────────────────────────────────────────────');
  lines.push('');

  return lines.join('\n');
}

import type { AuditLanguage, AuditReport } from './types.js';

export function renderHtmlReport(report: AuditReport, lang: AuditLanguage = 'en'): string {
  const isPl = lang === 'pl';

  const bandColors = {
    excellent: '#10b981', // green
    good: '#3b82f6', // blue
    warning: '#f59e0b', // amber
    critical: '#ef4444', // red
  };

  const bandLabels = {
    excellent: isPl ? 'Wzorcowa higiena agentów' : 'Excellent Agent Hygiene',
    good: isPl ? 'Dobra dyscyplina projektowa' : 'Good Project Discipline',
    warning: isPl ? 'Wymaga uwagi i zabezpieczeń' : 'Needs Quality Hardening',
    critical: isPl ? 'Krytyczne ryzyko regresji AI' : 'Critical AI Regression Risk',
  };

  const currentColor = bandColors[report.band];
  const currentLabel = bandLabels[report.band];

  // SVG Gauge calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (report.score / 100) * circumference;

  const manualUrl = `https://cdal-henna.vercel.app/manual?utm_source=audit&utm_medium=report&utm_content=${report.band}&score=${report.score}`;

  const checksHtml = report.checks
    .map((check) => {
      const statusIcon = check.passed
        ? `<span class="badge badge-success">${isPl ? 'ZALICZONY' : 'PASSED'}</span>`
        : `<span class="badge badge-error">${isPl ? 'WYMAGA POPRAWY' : 'NEEDS ACTION'}</span>`;

      const findingsHtml =
        check.findings.length > 0
          ? `
          <div class="findings-list">
            <h4>${isPl ? 'Wykryte punkty uwagi:' : 'Detected Observations:'}</h4>
            <ul>
              ${check.findings
                .slice(0, 5)
                .map(
                  (f) =>
                    `<li>
                      <strong>${f.severity.toUpperCase()}</strong>: ${escapeHtml(f.message)}
                      ${f.file ? `<div class="code-loc">${escapeHtml(f.file)}${f.line ? `:${f.line}` : ''}</div>` : ''}
                      ${f.snippet ? `<pre class="code-snippet"><code>${escapeHtml(f.snippet)}</code></pre>` : ''}
                    </li>`,
                )
                .join('')}
              ${
                check.findings.length > 5
                  ? `<li class="more-findings">+ ${check.findings.length - 5} ${isPl ? 'więcej obserwacji' : 'more items'}...</li>`
                  : ''
              }
            </ul>
          </div>
        `
          : '';

      return `
      <div class="check-card ${check.passed ? 'check-passed' : 'check-failed'}">
        <div class="check-header">
          <div class="check-title">
            <h3>${escapeHtml(check.name)}</h3>
            <div class="check-score-pill">${check.score} / ${check.maxScore} ${isPl ? 'pkt' : 'pts'}</div>
          </div>
          <div>${statusIcon}</div>
        </div>
        <p class="check-details">${escapeHtml(check.details)}</p>
        ${findingsHtml}
        <div class="check-footer">
          <a href="${escapeHtml(check.docsUrl)}" target="_blank" rel="noopener" class="docs-link">
            ${isPl ? 'Czytaj wytyczne CDAL w dokumentacji →' : 'Read CDAL guidance in documentation →'}
          </a>
        </div>
      </div>
    `;
    })
    .join('');

  const recommendationsHtml = report.recommendations
    .map((rec) => {
      const priorityClass =
        rec.priority === 'high'
          ? 'priority-high'
          : rec.priority === 'medium'
            ? 'priority-medium'
            : 'priority-low';
      const priorityLabel =
        rec.priority === 'high'
          ? isPl
            ? 'Wysoki priorytet'
            : 'High Priority'
          : rec.priority === 'medium'
            ? isPl
              ? 'Średni priorytet'
              : 'Medium Priority'
            : isPl
              ? 'Niski priorytet'
              : 'Low Priority';

      return `
      <div class="rec-card ${priorityClass}">
        <div class="rec-header">
          <span class="badge ${priorityClass}-badge">${priorityLabel}</span>
          <a href="${escapeHtml(rec.docsUrl)}" target="_blank" rel="noopener" class="docs-link">${isPl ? 'Dokumentacja' : 'Docs'}</a>
        </div>
        <h3>${escapeHtml(rec.title)}</h3>
        <p>${escapeHtml(rec.description)}</p>
        ${
          rec.remediationSnippet
            ? `<div class="snippet-box"><pre><code>${escapeHtml(rec.remediationSnippet)}</code></pre></div>`
            : ''
        }
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CDAL Audit Report — ${report.score}/100 (${report.targetPath})</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --score-color: ${currentColor};
      --success: #10b981;
      --error: #ef4444;
      --warn: #f59e0b;
      --code-bg: #030712;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --card-border: #e2e8f0;
        --text-main: #0f172a;
        --text-muted: #64748b;
        --code-bg: #f1f5f9;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.6;
      padding: 2rem 1rem;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3b82f6, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .report-meta {
      font-size: 0.875rem;
      color: var(--text-muted);
      text-align: right;
    }

    /* Score Hero */
    .hero-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 2.5rem;
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 2rem;
      align-items: center;
      margin-bottom: 2.5rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 640px) {
      .hero-card {
        grid-template-columns: 1fr;
        text-align: center;
      }
    }

    .gauge-wrapper {
      position: relative;
      width: 160px;
      height: 160px;
      margin: 0 auto;
    }

    .gauge-svg {
      transform: rotate(-90deg);
    }

    .gauge-bg {
      stroke: var(--card-border);
      stroke-width: 12;
      fill: none;
    }

    .gauge-meter {
      stroke: var(--score-color);
      stroke-width: 12;
      stroke-linecap: round;
      fill: none;
      stroke-dasharray: ${circumference.toFixed(1)};
      stroke-dashoffset: ${strokeDashoffset.toFixed(1)};
      transition: stroke-dashoffset 1s ease-in-out;
    }

    .gauge-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .gauge-sub {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .hero-info h1 {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .hero-band {
      display: inline-block;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--score-color);
      margin-bottom: 1rem;
    }

    .hero-stats {
      display: flex;
      gap: 1.5rem;
      margin-top: 1.25rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .hero-stat-item strong {
      color: var(--text-main);
    }

    /* CTA Banner */
    .cta-card {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.12));
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      padding: 1.75rem 2rem;
      margin-bottom: 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }

    @media (max-width: 720px) {
      .cta-card {
        flex-direction: column;
        text-align: center;
      }
    }

    .cta-button {
      background: var(--accent);
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s ease;
      white-space: nowrap;
      display: inline-block;
    }

    .cta-button:hover {
      background: var(--accent-hover);
    }

    /* Section Headers */
    .section-title {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      letter-spacing: -0.01em;
    }

    /* Cards */
    .check-card, .rec-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.25rem;
    }

    .check-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .check-title h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .check-score-pill {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .check-details {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-bottom: 1rem;
    }

    .badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .badge-error { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    .priority-high-badge { background: rgba(239, 68, 68, 0.2); color: var(--error); }
    .priority-medium-badge { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
    .priority-low-badge { background: rgba(59, 130, 246, 0.2); color: var(--accent); }

    .findings-list {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      font-size: 0.875rem;
    }

    .findings-list h4 {
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .findings-list ul {
      padding-left: 1.25rem;
    }

    .findings-list li {
      margin-bottom: 0.5rem;
    }

    .code-loc {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
    }

    .code-snippet {
      font-family: var(--font-mono);
      background: var(--card-bg);
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      overflow-x: auto;
    }

    .check-footer {
      border-top: 1px solid var(--card-border);
      padding-top: 0.75rem;
      margin-top: 0.75rem;
    }

    .docs-link {
      color: var(--accent);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .docs-link:hover {
      text-decoration: underline;
    }

    .snippet-box {
      margin-top: 0.75rem;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      padding: 0.6rem 0.9rem;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 0.825rem;
      color: var(--text-main);
    }

    /* Print styles */
    @media print {
      body {
        background: #fff !important;
        color: #000 !important;
        padding: 0;
      }
      .cta-card { display: none !important; }
      .check-card, .rec-card, .hero-card {
        page-break-inside: avoid;
        border: 1px solid #ccc !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-logo">C</div>
        <div class="brand-title">CDAL Kit</div>
      </div>
      <div class="report-meta">
        <div>${escapeHtml(report.targetPath)}</div>
        <div>${new Date(report.timestamp).toLocaleString(isPl ? 'pl-PL' : 'en-US')}</div>
      </div>
    </header>

    <div class="hero-card">
      <div class="gauge-wrapper">
        <svg class="gauge-svg" width="160" height="160">
          <circle class="gauge-bg" cx="80" cy="80" r="${radius}"></circle>
          <circle class="gauge-meter" cx="80" cy="80" r="${radius}"></circle>
        </svg>
        <div class="gauge-text">${report.score}</div>
      </div>
      <div class="hero-info">
        <h1>${isPl ? 'Wynik audytu higieny agentów AI' : 'AI Agent Quality & Hygiene Audit'}</h1>
        <div class="hero-band">${currentLabel}</div>
        <p>
          ${
            isPl
              ? 'Weryfikacja dyscypliny kontraktowej, separacji ról, twardych uprawnień narzędziowych oraz braku wycieków i cichego dryfu kodu.'
              : 'Deterministic verification of contract discipline, role separation, tool execution gates, and secret protection.'
          }
        </p>
        <div class="hero-stats">
          <div class="hero-stat-item"><strong>${report.summary.passed} / ${report.summary.total}</strong> ${isPl ? 'zaliczonych' : 'passed'}</div>
          <div class="hero-stat-item"><strong>${report.stats.totalFiles}</strong> ${isPl ? 'plików' : 'files'}</div>
          <div class="hero-stat-item"><strong>${report.stats.totalLinesOfCode}</strong> LOC</div>
          <div class="hero-stat-item"><strong>${report.stats.durationMs}ms</strong></div>
        </div>
      </div>
    </div>

    <div class="cta-card">
      <div>
        <h3 style="font-weight: 700; margin-bottom: 0.25rem;">
          ${isPl ? 'Chcesz uszczelnić jakość kodu pisanego przez agentów?' : 'Need to harden agentic workflows for your team?'}
        </h3>
        <p style="font-size: 0.9rem; color: var(--text-muted);">
          ${
            isPl
              ? 'Sprawdź 60-sekundowy manual vibecodingu i zabezpiecz swoje repozytorium w Cursorze, Windsurfie lub Antigravity.'
              : 'Check out the 60-second vibecoding manual to harden your repo in Cursor, Windsurf or Antigravity.'
          }
        </p>
      </div>
      <div>
        <a href="${manualUrl}" data-cal-url="https://cal.com/cdal/omowienie-audytu" target="_blank" rel="noopener" class="cta-button">
          ${isPl ? 'Otwórz Manual Vibecodingu (60s) →' : 'Open Vibecoding Manual (60s) →'}
        </a>
      </div>
    </div>

    ${
      report.recommendations.length > 0
        ? `
      <section style="margin-bottom: 3rem;">
        <h2 class="section-title">${isPl ? 'Priorytetowe rekomendacje' : 'Priority Recommendations'}</h2>
        ${recommendationsHtml}
      </section>
    `
        : ''
    }

    <section>
      <h2 class="section-title">${isPl ? 'Szczegółowy przegląd 8 sprawdzeń' : 'Detailed 8 Checks Review'}</h2>
      ${checksHtml}
    </section>

    <footer style="margin-top: 4rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; border-top: 1px solid var(--card-border); padding-top: 2rem;">
      <p>${isPl ? 'Wygenerowano przez' : 'Generated by'} <strong>CDAL Audit</strong> (offline, zero telemetry). <a href="https://cdal.dev" target="_blank" rel="noopener" class="docs-link">cdal.dev</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

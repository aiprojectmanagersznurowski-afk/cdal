import type {
  AuditBand,
  AuditCheckId,
  AuditCheckResult,
  AuditLanguage,
  AuditRecommendation,
  AuditReport,
  AuditStats,
} from './types.js';

export const DEFAULT_WEIGHTS: Record<AuditCheckId, number> = {
  'agent-config': 15,
  'type-silencing': 15,
  'skipped-tests': 10,
  'agent-self-grading': 15,
  'requirement-traceability': 10,
  'ci-gates': 15,
  'secret-leaks': 15,
  'generated-drift': 5,
};

export function calculateAuditBand(score: number): AuditBand {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

export function generateRecommendations(
  checks: AuditCheckResult[],
  lang: AuditLanguage = 'en',
): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = [];

  for (const check of checks) {
    if (check.passed && check.score === check.maxScore) {
      continue;
    }

    switch (check.id) {
      case 'agent-config':
        recommendations.push({
          id: 'REC-AGENT-CONFIG',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Wdróż twarde hooki PreToolUse dla agentów AI'
              : 'Implement hard PreToolUse hooks for AI agents',
          description:
            lang === 'pl'
              ? 'Same prompty w CLAUDE.md/AGENTS.md nie gwarantują dyscypliny. Skonfiguruj hook PreToolUse w .claude/settings.json lub .agents/ używając `npx cdalkit sync`.'
              : 'Prompt instructions alone do not enforce agent discipline. Configure PreToolUse hooks in .claude/settings.json or .agents/ using `npx cdalkit sync`.',
          priority: 'high',
          docsUrl: 'https://cdal.dev/docs/concepts/roles',
          remediationSnippet: 'npx cdalkit init --preset typescript-strict',
        });
        break;

      case 'type-silencing':
        recommendations.push({
          id: 'REC-TYPE-SILENCING',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Zastąp @ts-ignore i "as any" precyzyjnym typowaniem'
              : 'Eliminate @ts-ignore and "as any" with strict typing',
          description:
            lang === 'pl'
              ? 'Wyciszenia typów maskują halucynacje modeli AI. Zdefiniuj regułę forbidden w cdal.config.mjs i napraw brakujące interfejsy.'
              : 'Type silencing hides model hallucinations and runtime crashes. Enforce forbidden rules in cdal.config.mjs.',
          priority: 'high',
          docsUrl: 'https://cdal.dev/docs/presets/typescript-strict',
          remediationSnippet: 'npx cdalkit verify',
        });
        break;

      case 'skipped-tests':
        recommendations.push({
          id: 'REC-SKIPPED-TESTS',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Usuń .skip i .only z plików testowych'
              : 'Remove .skip and .only from test files',
          description:
            lang === 'pl'
              ? 'Wyciszone testy lub filtry .only powodują fałszywie zielone pipeline’y CI. Przywróć pełną egzekucję testów.'
              : 'Muted tests or .only filters hide regressions in CI. Restore full test suite execution.',
          priority: 'high',
          docsUrl: 'https://cdal.dev/docs/concepts/gates#forbidden-rules',
        });
        break;

      case 'agent-self-grading':
        recommendations.push({
          id: 'REC-AGENT-SELF-GRADING',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Zablokuj implementerowi możliwość edycji testów'
              : 'Deny implementer write scope on test files',
          description:
            lang === 'pl'
              ? 'Gdy agent zmienia kod i testy w tym samym kroku, dostosowuje testy pod swoje błędy. Rozdziel role test-author i implementer (denyTests: true).'
              : 'When agents modify tests and code simultaneously, they weaken tests to fit faulty code. Separate test-author and implementer roles.',
          priority: 'high',
          docsUrl: 'https://cdal.dev/docs/concepts/roles#separation-of-phases',
        });
        break;

      case 'requirement-traceability':
        recommendations.push({
          id: 'REC-REQUIREMENTS-TRACE',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Połącz testy z wymaganiami za pomocą znaczników @REQ'
              : 'Link tests to requirements with @REQ tags',
          description:
            lang === 'pl'
              ? 'Zdefiniuj kontrakt wymagań (contracts/requirements.contract.mjs) i oznacz testy tagami `// @REQ: <ID>`. Uruchamiaj `cdal trace --enforce`.'
              : 'Define a requirements contract and tag tests with `// @REQ: <ID>`. Run `cdal trace --enforce` in CI.',
          priority: 'medium',
          docsUrl: 'https://cdal.dev/docs/concepts/loop#trace',
          remediationSnippet: 'npx cdalkit trace --enforce',
        });
        break;

      case 'ci-gates':
        recommendations.push({
          id: 'REC-CI-GATES',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Skonfiguruj deterministyczną bramkę jakości w CI na Pull Requestach'
              : 'Configure deterministic CI pull request quality gate',
          description:
            lang === 'pl'
              ? 'Dodaj workflow GitHub Actions wykonujący testy, weryfikację kontraktów i typecheck przy każdym PR przed zmergowaniem do main.'
              : 'Add GitHub Actions workflow running tests, contract checks, and typechecks on PRs before merge.',
          priority: 'high',
          docsUrl: 'https://cdal.dev/docs/concepts/gates#ci-pipeline',
        });
        break;

      case 'secret-leaks':
        recommendations.push({
          id: 'REC-SECRET-LEAKS',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Natychmiast unieważnij i usuń wykryte klucze API ze śledzonych plików'
              : 'Immediately revoke and remove exposed API keys from tracked files',
          description:
            lang === 'pl'
              ? 'Klucze prywatne lub produkcyjne nie mogą znajdować się w kodzie źródłowym. Używaj zmiennych środowiskowych i zablokuj sekrety hookiem guard-bash.'
              : 'Never store production keys in source control. Use environment variables and block secret commits via hooks.',
          priority: 'high',
          docsUrl: 'https://cdal.dev/docs/concepts/gates#forbidden-rules',
        });
        break;

      case 'generated-drift':
        recommendations.push({
          id: 'REC-GENERATED-DRIFT',
          checkId: check.id,
          title:
            lang === 'pl'
              ? 'Zabezpiecz wygenerowane pliki checkiem dryfu w CI'
              : 'Protect generated files with codegen drift check in CI',
          description:
            lang === 'pl'
              ? 'Dodaj krok `cdal codegen --check` do CI, aby zapobiec ręcznym edycjom lub niespójnościom generowanego kodu z kontraktami.'
              : 'Add `cdal codegen --check` to CI to prevent out-of-sync generated code.',
          priority: 'low',
          docsUrl: 'https://cdal.dev/docs/concepts/contracts#deterministic-codegen',
          remediationSnippet: 'npx cdalkit codegen --check',
        });
        break;
    }
  }

  return recommendations;
}

export function buildAuditReport(
  targetPath: string,
  checks: AuditCheckResult[],
  stats: AuditStats,
  lang: AuditLanguage = 'en',
): AuditReport {
  let totalScore = 0;
  let totalMax = 0;
  let passedCount = 0;

  for (const check of checks) {
    totalScore += check.score;
    totalMax += check.maxScore;
    if (check.passed) {
      passedCount++;
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)));
  const band = calculateAuditBand(finalScore);
  const recommendations = generateRecommendations(checks, lang);

  return {
    $schema: 'https://cdal.dev/schemas/audit.v1.json',
    version: 'audit.v1',
    timestamp: new Date().toISOString(),
    targetPath,
    score: finalScore,
    maxScore: totalMax,
    band,
    summary: {
      passed: passedCount,
      failed: checks.length - passedCount,
      total: checks.length,
    },
    stats,
    checks,
    recommendations,
  };
}

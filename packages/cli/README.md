# cdal

**Stop AI agents from rewriting your tests.** `cdal` adds hard quality gates to Claude Code, Cursor, Windsurf and Antigravity: contracts as the single source of truth, role-scoped agents that physically can't edit tests (PreToolUse hook, exit 2), requirement-to-test traceability, and mutation tests for the gates themselves.

## Free audit in 15 seconds

```bash
npx cdalkit audit
```

Runs 100% offline — no code leaves your machine — and scores your repository 0–100 across 8 AI-hygiene checks: agent configuration and hooks, type silencing (`@ts-ignore`, `as any`), skipped tests, agents grading themselves, requirement traceability, CI gates, secret leaks and generated-file drift. Add `--html report.html` for a standalone report.

## Set up the gates

```bash
npx cdalkit init      # config, starter contracts, agent roles and hooks
npx cdalkit verify    # the full deterministic gate: validate, codegen --check, typecheck, lint, test, trace, selftest
```

| Command | What it does |
|---|---|
| `cdal validate` | Check contract invariants |
| `cdal codegen` | Generate TypeScript types and docs from contracts (`--check` for drift) |
| `cdal trace --enforce` | Fail unless every requirement has a test tagged `// @REQ: <ID>` |
| `cdal selftest` | Mutation-test the gates: every rule must fire red |
| `cdal phase` | Check the git diff against the current loop phase (contract, red, green) |
| `cdal sync` | Generate agent roles, commands and hooks for each runtime |
| `cdal doctor` | Diagnose installation and hook wiring |

## Links

- Website and docs: https://cdal-henna.vercel.app
- Getting started: https://cdal-henna.vercel.app/docs/getting-started
- CLI reference: https://cdal-henna.vercel.app/docs/cli-reference

Apache-2.0 © Michał Sznurowski

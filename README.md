# CDAL Kit (Contract-Driven Agentic Loop)

<div align="center">

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Runtime Dependencies](https://img.shields.io/badge/Runtime%20Deps-Zero%20(Core)-emerald.svg)](./packages/core)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D20.9.0-black.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.7-blue.svg)](https://www.typescriptlang.org/)
[![Verification](https://img.shields.io/badge/Quality%20Gates-7%2F7%20Deterministic-purple.svg)](#deterministic-verification-pipeline)

**"Your AI agents write the code. CDAL makes it rock solid."**  
*"Seatbelts for vibecoding in Cursor, Windsurf, Antigravity and Claude Code."*

[Website](https://cdal-henna.vercel.app) • [Vibecoding Manual](./docs/manual-vibecoding.md) • [Documentation](./content/docs) • [Case Study](https://cdal-henna.vercel.app/case-study) • [Reference Example](./examples/booking-lite)

</div>

---

## 30-Second Summary

AI coding agents (Claude Code, Cursor, Codex, Gemini/Antigravity) write code at superhuman speed. But left ungoverned, they introduce systemic risks into production codebases:
1. **Self-Grading Agents:** When an agent writes both the implementation and its tests, it inevitably weakens assertions to make its own code pass.
2. **Silent Quality Erosion:** Agents silently bypass compiler checks using `@ts-ignore`, `@ts-expect-error`, `as any`, and skip failing tests (`it.skip`).
3. **Requirement Drift:** Business specifications wander away from code over multi-turn agent sessions without verifiable traceability.

**CDAL Kit** solves this by treating contracts as the single source of truth and enforcing physical boundaries on AI agents:
- **Contracts as Single Source of Truth (`*.contract.mjs`):** Invariants, state machines, and operational thresholds live in deterministic contract files that emit TypeScript types, runtime schemas, and documentation.
- **Physical Write Denial (`denyTests: true`):** Subagents assigned the `implementer` role are blocked via physical `PreToolUse` hooks (exit code 2) from editing test files. They must write code that satisfies external tests.
- **100% Traceability Enforcement (`cdal trace --enforce`):** Every requirement (`REQ-*`) must be covered by at least one passing test tagged with `// @REQ: <ID>`.
- **Quality Gate Mutation Testing (`cdal selftest`):** CDAL actively mutates contracts and injects forbidden probes into production code to verify that quality gates fail red when rules are broken.

---

## The Closed Feedback Loop

```
PLAN ──► CONTRACT ──► RED ──► GREEN ──► VERIFY ──► REVIEW ──► INTEGRATE
```

| Phase | Responsible Role | Write Scope | Gate Rule |
| :--- | :--- | :--- | :--- |
| **PLAN** | `spec-analyst` | `docs/workorders/` | Explicit `REQ-*` requirements defined |
| **CONTRACT** | `contract-steward` | `contracts/` | Invariants and finite state machines updated |
| **RED** | `test-author` | `test/`, `tests/` | Failing tests tagged with `// @REQ: <ID>` |
| **GREEN** | `implementer` | `src/`, `packages/` | `denyTests: true` (cannot edit tests) |
| **VERIFY** | *Automated CLI* | None | Full 7-step deterministic pipeline (`cdal verify`) |
| **REVIEW** | `reviewer` | `.cdal/memory/` | Zero requirement drift and gate integrity check |
| **INTEGRATE** | Tech Lead / Human | Target Branch | Squash-merge to `main` with 100% trace |

---

## Quick Start

### 1. Run an Offline Hygiene Audit (15 Seconds)

Scan your existing repository for AI quality smells, type silencing density, skipped tests, and untracked agent edits without sending a single byte to the cloud:

```bash
npx cdalkit audit
```

Generates a standalone, interactive HTML report with a 0–100 score calibrated against real-world production repos:

```
[CDAL Audit] Analyzing local repository...
✔ Check 01: Agent Runtimes & PreToolUse Hooks (15/15)
✔ Check 02: TypeScript Type Silencing Density (15/15)
✔ Check 03: Muted or Isolated Tests (10/10)
✔ Check 04: Role Separation: "Self-Grading Agent" (15/15)
✔ Check 05: Requirements Traceability Matrix (10/10)
✔ Check 06: Continuous Integration PR Gates (15/15)
✔ Check 07: Secret Leak Detection (15/15)
✔ Check 08: Generated Code Drift Detection (5/5)

Total Hygiene Score: 100 / 100 (HEALTHY)
HTML Report saved to: .cdal/audit-report.html
```

### 2. Initialize CDAL in Your Project

Scaffold CDAL contracts, runtime adapters, and CI workflows:

```bash
npx cdalkit init
```

This provisions:
- `cdal.config.mjs` — Repository quality gate configuration.
- `.agents/` and `.claude/` — Role write scopes and physical exit 2 hooks.
- `contracts/` — Domain contracts directory with auto-codegen bindings.
- `.github/workflows/cdal-verify.yml` — Automated CI quality gate.

---

## Deterministic Verification Pipeline

CDAL enforces a strict 7-step verification gate before any pull request can be merged:

```bash
npx cdalkit verify
```

```
[1/7] ▶ node packages/cli/bin/cdal.mjs validate --strict
      Validates all contracts against invariant schemas.
[2/7] ▶ node packages/cli/bin/cdal.mjs codegen --check
      Verifies that generated TypeScript bindings have not drifted from contracts.
[3/7] ▶ pnpm typecheck
      Strict TypeScript validation without @ts-ignore or loose castings.
[4/7] ▶ pnpm lint
      Linter checks with forbidden tokens guardrails.
[5/7] ▶ pnpm test
      Runs unit and integration tests (zero skipped or muted tests allowed).
[6/7] ▶ node packages/cli/bin/cdal.mjs trace --enforce
      Enforces 100% requirement-to-test coverage matrix.
[7/7] ▶ node packages/cli/bin/cdal.mjs selftest
      Mutation testing of quality gates (proves validators fail red on violations).

✅ Full verification pipeline succeeded (7/7 passed).
```

---

## Monorepo Architecture

```
cdal/
├─ packages/
│  ├─ core/        @cdal/core     — Invariant engine, contracts loader, guard & selftest runner (0 runtime deps)
│  ├─ kinds/       @cdal/kinds    — Standard contract kinds (requirements, state-machine, policies)
│  ├─ adapters/    @cdal/adapters — Physical hooks for Claude Code, AGENTS.md, Antigravity
│  ├─ audit/       @cdal/audit    — Offline repo scanner & standalone HTML report generator
│  └─ cli/         cdal           — CLI binary entrypoint (commands & hook handler)
├─ presets/                       — Production rule presets (typescript-strict, nextjs, safe-defaults)
├─ examples/
│  └─ booking-lite/               — Complete reference implementation governed by CDAL
├─ apps/
│  └─ web/                        — Marketing site, interactive documentation, and commercial platform
└─ docs/                          — Architecture decision records and sales collateral
```

---

## Commercial Support & Self-Serve Packages

While CDAL Core is 100% open source under Apache-2.0, we provide dedicated self-serve starter kits and commercial packages for teams and solopreneurs:

| Offering | Description | Pricing | Next Step |
| :--- | :--- | :--- | :--- |
| **OSS Starter** | CDAL CLI, standard contracts, AGENTS.md / Cursor rules, 100% trace | Free ($0) | [Open Manual](./docs/manual-vibecoding.md) |
| **Pro Solo** | Advanced contract kinds (RBAC, notifications), 10 agent roles, private repo access | €99 one-time | [Buy Pro Solo](https://cdal-henna.vercel.app/checkout?tier=pro-solo) |
| **Pro Team** | Organization license (up to 15 seats), Next.js + Supabase/Prisma presets, team playbook | €399 one-time | [Buy Pro Team](https://cdal-henna.vercel.app/checkout?tier=pro-team) |
| **Team Workshop** | 1-day remote intensive on your codebase: configuring Claude Code subagents & exit 2 hooks | PLN 7,000 net (~€1,650) | [Inquire via Email](mailto:kontakt@cdal.dev?subject=CDAL%20Workshop) |
| **Pilot Implementation** | 2-week hands-on architect engagement on 1 critical production module with 0-regression guarantee | from PLN 18,000 net (~€4,200) | [Inquire via Email](mailto:kontakt@cdal.dev?subject=CDAL%20Pilot) |

Direct contact: **kontakt@cdal.dev** • Onboarding Guide: [docs/manual-vibecoding.md](./docs/manual-vibecoding.md)

---

## Reference Implementation

Inspect [`examples/booking-lite`](./examples/booking-lite) for a complete, production-grade reference project governed under CDAL:
- 3 contracts (`requirements`, `state-machine`, `policies`)
- 16 explicit requirements with 100% automated test traceability
- 16 active mutation testing probes in selftest
- Zero runtime dependencies in the governance layer

---

## Contributing

We welcome community contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and ensure all pull requests pass `npx cdalkit verify` before submitting.

---

## License

CDAL Kit is open-source software licensed under the **[Apache License 2.0](./LICENSE)**.

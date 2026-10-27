---
title: "Getting Started"
description: "How to initialize and enforce CDAL in your project in under 5 minutes"
---

# Getting Started with CDAL

CDAL works with both existing TypeScript/JavaScript applications (Next.js, Node services, monorepos) and clean greenfield projects.

---

## 1. Quick Audit (Zero Installation)

Before making any changes to your project, you can run a local, read-only AI hygiene audit on your repository:

```bash
npx cdal audit
```

This scans your codebase locally in < 15 seconds (zero network calls, zero data leaks) and generates a standalone offline HTML report evaluating:
- Agent runtime setup & PreToolUse hooks
- Type silencing density (`@ts-ignore`, `as any`)
- Muted or isolated tests (`it.skip`, `describe.only`)
- "Self-grading agent" commit patterns
- Requirements traceability (`@REQ`)
- CI quality gates and secret leaks

---

## 2. Initialize CDAL in Your Project

Run the interactive setup wizard in the root of your project:

```bash
npx cdal init
```

Or run non-interactively with safe default presets:

```bash
npx cdal init --preset typescript-strict --yes
```

This generates:
- `cdal.config.mjs`: Central configuration defining contracts, roles, forbidden rules, and verification steps.
- `contracts/requirements.contract.mjs`: Starter contract with traceable business requirements.
- `.claude/settings.json`: PreToolUse hook router for Claude Code subagent roles.
- `AGENTS.md` and `.cursor/rules/cdal.mdc`: Universal agent instructions for Cursor, Codex, and OpenHands.
- Verification script in `package.json`: `"verify": "cdal verify"`.

---

## 3. Verify Your Initial Setup

Run the deterministic verification pipeline:

```bash
npx cdal verify
```

CDAL executes each step sequentially:
1. `cdal validate --strict` — Contract invariants check
2. `cdal codegen --check` — Drift detector for emitted TypeScript types
3. `pnpm typecheck` — TypeScript strict type validation
4. `pnpm test` — Automated test suite
5. `cdal trace --enforce` — Ensures all active requirements have `@REQ:` test coverage
6. `cdal selftest` — Mutation testing of the quality gates

---

## 4. Run the First Agent Cycle

When launching an agent (e.g., in Claude Code):

1. **PLAN:** Specify work order requirements with explicit IDs in `docs/workorders/` (e.g. `AUTH-REQ-LOGIN`).
2. **CONTRACT:** Define or update the domain contract:
   ```bash
   npx cdal window open AUTH-101
   # Edit contracts/requirements.contract.mjs
   npx cdal window close
   npx cdal codegen
   ```
3. **RED:** Author failing tests in `test/auth.test.ts` tagged with `// @REQ: AUTH-REQ-LOGIN`.
4. **GREEN:** Have the `implementer` agent role implement the feature. Notice that if the agent attempts to edit `test/auth.test.ts`, the PreToolUse hook immediately rejects the write with exit code 2.
5. **VERIFY:** Run `npx cdal verify` to seal the loop.

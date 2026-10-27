---
title: "The CDAL Loop"
description: "The 7-step engineering cycle for reliable AI software creation"
---

# The CDAL Loop Cycle

Every change under CDAL progresses through a structured 7-stage lifecycle:

```
PLAN ──► CONTRACT ──► RED ──► GREEN ──► VERIFY ──► REVIEW ──► INTEGRATE
```

---

## 1. PLAN
- **Actor:** `spec-analyst`
- **Output:** Work Order in `docs/workorders/` with explicit requirement IDs (`REQ-*`) and acceptance criteria.
- **Rule:** No code is written until requirements have unique IDs.

## 2. CONTRACT
- **Actor:** `contract-steward`
- **Action:** Open contract window (`cdal window open <WO-ID>`).
- **Output:** Invariants and domain models codified in `contracts/*.contract.mjs`.
- **Validation:** `cdal validate --strict && cdal codegen`.

## 3. RED
- **Actor:** `test-author`
- **Output:** Automated failing test suites in `test/*.test.ts`.
- **Rule:** Every test must be annotated with `// @REQ: <ID>`. Tests must fail before implementation starts.

## 4. GREEN
- **Actor:** `implementer`
- **Constraint:** Strictly forbidden from modifying tests (`denyTests: true`). Maximum 3 iterative retry attempts to pass tests.
- **Rule:** Write the minimum production code needed to satisfy the failing tests.

## 5. VERIFY
- **Actor:** Deterministic Verification Pipeline (`cdal verify`)
- **Automated Steps:**
  1. `cdal validate --strict`
  2. `cdal codegen --check`
  3. `pnpm typecheck`
  4. `pnpm lint`
  5. `pnpm test`
  6. `cdal trace --enforce`
  7. `cdal selftest`

## 6. REVIEW
- **Actor:** `reviewer`
- **Checklist:** Audit zero test edits, zero forbidden pattern evasion, zero spec drift, 100% trace coverage.

## 7. INTEGRATE
- **Action:** Squash-merge PR to `main` and delete the feature branch.

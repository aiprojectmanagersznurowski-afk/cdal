---
title: "Quality Gates & Selftest"
description: "Deterministic quality gates, mutation testing, and traceability matrix"
---

# Quality Gates & Selftest

In traditional development, quality guidelines are often advisory. Under CDAL, **every quality gate is mechanical, deterministic, and tested against its own mutations**.

---

## 1. Traceability Matrix (`cdal trace --enforce`)

`cdal trace` verifies that requirements defined in contracts are backed by automated tests:

```bash
npx cdalkit trace --enforce
```

### How to Tag Tests:
```typescript
// test/booking.test.ts
import { describe, it, expect } from 'vitest';

describe('Booking Service', () => {
  // @REQ: BOOK-REQ-MIN-NOTICE
  it('enforces minimum 2-hour notice policy before booking start', () => {
    // assertions...
  });
});
```

If any requirement in `contracts/` lacks a matching test tag, `cdal trace --enforce` fails the pipeline with an exit code of 1.

---

## 2. Gate Mutation Testing (`cdal selftest`)

> *"A quality gate that cannot be proven to fail red is merely a decoration."*

`cdal selftest` verifies the integrity of the test pipeline itself:
1. It copies contracts into an isolated in-memory or temporary environment.
2. It injects deliberate mutations into the contracts (e.g. duplicate IDs, unreachable states, invalid policy bands).
3. It asserts that **specifically the expected rule fires and fails red**.
4. It injects forbidden code probes (e.g. `@ts-ignore`, `as any`, `.skip()`) into dummy production files to verify that the guardrails detect them.

If any invariant rule or forbidden pattern fails to detect its assigned mutation, `cdal selftest` fails immediately.

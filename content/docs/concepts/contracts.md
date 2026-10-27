---
title: "Contracts"
description: "Contracts as the single source of truth in CDAL"
---

# Contracts in CDAL

In CDAL, **contracts are the single source of truth** for your system's business rules, state machines, operational policies, and requirements.

---

## Why Pure ECMAScript (`*.contract.mjs`)?

Contracts are written as standard ECMAScript modules (`.mjs`):
- **Zero build step:** Can be evaluated directly in Node.js standard runtime without Babel, Webpack, or TypeScript compilers.
- **Dynamic validation:** Complex invariant expressions and mathematical constraints can be validated programmatically at execution time.
- **Tool-agnostic:** Pure JS works across IDEs, linting engines, and git hooks.

```javascript
// contracts/policies.contract.mjs
export default {
  policies: [
    {
      id: 'BOOKING-MIN-NOTICE',
      scope: 'booking',
      unit: 'hours',
      value: 2,
      description: 'Bookings must be requested at least 2 hours before scheduled slot.',
    },
    {
      id: 'MAX-BOOKING-DURATION',
      scope: 'booking',
      unit: 'minutes',
      value: 480,
      description: 'Single booking cannot exceed 8 hours.',
    },
  ],
};
```

---

## The Contract Lifecycle

1. **Controlled Mutation Window:** Contracts reside in protected paths (`contracts/`). Agents cannot edit them unless the contract window is opened via `cdal window open <TICKET>`.
2. **Invariant Validation (`cdal validate`):** Static semantic rules check for unique IDs, referential integrity, deterministic transitions, and absence of dead ends.
3. **Deterministic Codegen (`cdal codegen`):** Emits immutable TypeScript definitions (`src/generated/contracts/`) and architectural diagrams (`docs/generated/`).
4. **Drift Detection (`cdal codegen --check`):** CI ensures no developer or AI agent has tampered with generated code manually.

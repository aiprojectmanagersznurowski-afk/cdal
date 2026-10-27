---
title: "Contract Kinds"
description: "The extensible ContractKind model in CDAL"
---

# Contract Kinds (`@cdal/kinds`)

A **Kind** is a reusable abstraction that defines how a particular category of contract is loaded, validated, codified into TypeScript, and tested through mutations.

CDAL ships with 3 standard open-source kinds:

```javascript
// cdal.config.mjs
import { defineConfig } from '@cdal/core';
import { requirements, stateMachine, policies } from '@cdal/kinds';

export default defineConfig({
  contractsDir: 'contracts',
  kinds: [
    requirements(),
    stateMachine({ file: 'booking-flow.contract.mjs' }),
    policies(),
  ],
});
```

---

## 1. Requirements Kind (`requirements()`)
Maintains the canonical register of business requirements (`REQ-*`).

### Validations:
- `REQ-UNIQUE-IDS`: Every requirement ID must be strictly unique.
- `REQ-COMPLETE`: Every requirement must define a title, acceptance criteria array, and status.
- `REQ-STATUS-VALID`: Status must be one of `DRAFT`, `ACCEPTED`, `IMPLEMENTED`, or `DEPRECATED`.
- `REQ-PARENT-EXISTS`: Hierarchical requirements must refer to valid parent IDs.

---

## 2. State Machine Kind (`stateMachine()`)
Models domain state transitions, guards, actors, and allowed events.

### Validations:
- `STATE-UNIQUE-IDS`: State IDs must be unique.
- `STATE-KNOWN-STATES`: All transition `from` and `to` targets must exist in declared states.
- `STATE-DETERMINISM`: No duplicate transitions from the same state on the same event without distinct guards.
- `STATE-REACHABILITY`: Every state must be reachable from the `initialState` via BFS traversal.
- `STATE-NO-DEAD-ENDS`: Non-terminal states must have at least one outgoing transition.
- `STATE-SELF-LOOP-GUARD`: Self-loop transitions (`from === to`) must define a guard condition.

---

## 3. Policies Kind (`policies()`)
Defines numerical boundaries, working hours, and tiered threshold bands.

### Validations:
- `POLICY-UNIQUE-IDS`: Policy IDs must be unique.
- `POLICY-SHAPE`: Must include scope, unit, and value/bands.
- `POLICY-BANDS-ORDER`: Tiered bands must maintain strictly ascending thresholds.

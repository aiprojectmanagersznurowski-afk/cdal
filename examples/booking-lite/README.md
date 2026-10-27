# booking-lite — CDAL Reference Example

A sample Node.js/TypeScript application built with the **Contract-Driven Agentic Loop (CDAL)** architecture.
It shows complete lifecycle management for resource bookings (states, time policies, overlap protection) driven by formal contracts.

---

## 1. Contract Architecture

The project uses 3 standard contract kinds (`@cdal/kinds`):
1. **`contracts/requirements.contract.mjs`** (`requirements`) — 16 formal business requirements (`BOOK-REQ-INIT` through `BOOK-REQ-OVERLAP-PREVENTION`).
2. **`contracts/state-machine.contract.mjs`** (`state-machine`) — A deterministic state machine (`DRAFT` → `REQUESTED` → `CONFIRMED` → `COMPLETED` / `CANCELLED` / `REJECTED`).
3. **`contracts/policies.contract.mjs`** (`policies`) — Configurable numeric rules (2h minimum notice, 24h free cancellation window, 8h maximum duration, working hours 08:00–20:00).

All TypeScript types and Mermaid diagrams in `src/generated/contracts/` and `docs/generated/` are generated automatically and deterministically by `cdal codegen`.

---

## 2. Walk Through the CDAL Loop in 10 Minutes

Here is how a developer and an AI agent work together with CDAL:

### Step 1: PLAN (define the requirement)
Every change starts with a requirement ID. In `contracts/requirements.contract.mjs` you add:
```js
{
  id: 'BOOK-REQ-VIP-DISCOUNT',
  statement: 'VIP customers get a 20% discount on bookings.',
  acceptance: ['A 20% discount is applied for VIP customers'],
  status: 'TODO',
  source: 'docs/SPEC.md#discounts',
}
```

### Step 2: CONTRACT (update the contract)
Open the contract window and generate the artifacts:
```bash
npx cdal window open "Add VIP discount policy"
# edit contracts/policies.contract.mjs
npx cdal codegen
npx cdal window close
```
The generated TypeScript files in `src/generated/contracts/` immediately pick up the new types, with no hand-written boilerplate.

### Step 3: RED (write a failing test tagged with @REQ)
The `test-author` role writes a test tagged with the requirement ID:
```ts
// @REQ: BOOK-REQ-VIP-DISCOUNT
it('applies 20% discount for VIP customer', () => {
  const booking = createDraft({ ...params, isVip: true });
  expect(calculatePrice(booking)).toBe(80);
});
```
Run the test: `pnpm test` — it **must be red** before you move on to implementation!

### Step 4: GREEN (implement the production code)
The `implementer` role writes code in `src/booking-service.ts`.
> **Hard rule:** The implementer is blocked from touching files in `test/`. It cannot weaken assertions to make a test pass!

### Step 5: VERIFY (run the deterministic gate)
```bash
pnpm verify
# or:
npx cdal verify
```
The verification gate automatically checks:
1. Contract consistency (`cdal validate --strict`)
2. No drift in generated code (`cdal codegen --check`)
3. Type correctness (`tsc --noEmit`)
4. Forbidden-rule cleanliness (`pnpm lint`)
5. All tests passing (`pnpm test`)
6. Requirement-to-test coverage matrix (`cdal trace --enforce`)
7. Mutation tests of the gates themselves (`cdal selftest`)

### Step 6: SELFTEST (check that the gates really guard the code)
```bash
npx cdal selftest
```
The mutation engine creates temporary copies of the contracts and injects mutations. If the validator doesn't catch the defect, selftest fails.

---

## 3. Commands

| Command | What it does |
|---|---|
| `pnpm test` | Run the Vitest tests |
| `pnpm typecheck` | TypeScript static analysis |
| `npx cdal codegen` | Deterministically generate types and docs from contracts |
| `npx cdal trace --enforce` | Verify 100% requirement coverage (@REQ) |
| `npx cdal selftest` | Mutation tests of contract rules and guardrail probes |
| `npx cdal verify` | The full quality gate |

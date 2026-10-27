---
title: "Writing a Custom Contract Kind"
description: "How to define, validate, codegen, and test your own contract abstractions"
---

# Writing a Custom Contract Kind

When your domain has unique architectural constraints (e.g. pricing formulas, workflow graphs, hardware interface registers), you can implement a custom `ContractKind`.

---

## The `ContractKind<TData>` Interface

```typescript
import { type ContractKind, type Finding, type Rule } from '@cdal/core';

export interface SlaContractData {
  slas: Array<{ id: string; targetMinutes: number; severity: string }>;
}

export function slaKind(): ContractKind<SlaContractData> {
  return {
    id: 'sla',
    files: ['sla.contract.mjs'],
    load(mod: Record<string, unknown>): SlaContractData {
      const data = (mod.default ?? mod) as SlaContractData;
      if (!Array.isArray(data?.slas)) {
        throw new Error('SLA contract must export an array under "slas".');
      }
      return data;
    },
    rules: [
      {
        id: 'SLA-POSITIVE-TARGET',
        severity: 'error',
        check(data): Finding[] {
          const findings: Finding[] = [];
          for (const s of data.slas) {
            if (s.targetMinutes <= 0) {
              findings.push({
                ruleId: 'SLA-POSITIVE-TARGET',
                severity: 'error',
                file: 'sla.contract.mjs',
                message: `SLA "${s.id}" must have targetMinutes > 0 (found: ${s.targetMinutes}).`,
              });
            }
          }
          return findings;
        },
      },
    ],
    mutations: [
      {
        rule: 'SLA-POSITIVE-TARGET',
        file: 'sla.contract.mjs',
        find: /targetMinutes:\s*\d+/,
        replace: 'targetMinutes: 0',
      },
    ],
    emit(data) {
      const code = `export const SLAS = ${JSON.stringify(data.slas, null, 2)} as const;\n`;
      return [{ path: 'sla.ts', content: code }];
    },
  };
}
```

---

## Registering in `cdal.config.mjs`

```javascript
import { defineConfig } from '@cdal/core';
import { slaKind } from './tools/custom-kinds/sla.mjs';

export default defineConfig({
  kinds: [slaKind()],
});
```

Running `cdal selftest` will automatically verify your custom rule's mutation probe!

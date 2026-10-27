---
title: "Presets"
description: "Pre-configured quality rules and guardrails for TypeScript, Next.js, and Node"
---

# Presets in CDAL

Presets provide curated, battle-tested forbidden patterns, verification commands, and file scopes.

```javascript
// cdal.config.mjs
export default defineConfig({
  presets: ['typescript-strict', 'nextjs', 'safe-defaults'],
});
```

---

## 1. `typescript-strict`
Eliminates type silencing and evasive casting in production code.

- **Forbidden Patterns:**
  - `@ts-ignore` and `@ts-expect-error` in `src/` or `app/`
  - `as any` and double casting (`as unknown as any`)
  - Isolated and muted tests: `describe.only`, `it.only`, `test.skip`
- **Gate Evasion Probes:**
  - Blocks string split evasion: `['@ts', 'ignore'].join('')` or `"@" + "ts-ignore"`
  - Blocks double recast evasion: `as unknown as PrismaClient`

---

## 2. `nextjs`
Guardrails tailored for Next.js App Router applications.

- **Forbidden Patterns:**
  - Hardcoded internal color hex values in components (enforces CSS design tokens).
  - Secret keys in client-side bundles (e.g. `SUPABASE_SERVICE_ROLE_KEY` or `sk_live_` in `app/`).
  - Missing server/client component boundaries.

---

## 3. `safe-defaults` (Bash Guard)
Prevents destructive or irreversible shell commands during automated agent runs:
- `rm -rf /` or recursive deletions of root directories
- `git push --force` to protected branches
- Direct `npm publish` without human approval

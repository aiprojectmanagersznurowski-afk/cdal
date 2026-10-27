---
title: "Szybki start (PL)"
description: "Wdrożenie metodyki CDAL i pierwsza pętla z agentem AI w 10 minut"
---

# Szybki start z CDAL (w 10 minut)

Ten przewodnik przeprowadzi Cię przez proces wdrożenia jakościowych bramek CDAL w nowym lub istniejącym projekcie TypeScript / JavaScript.

---

## Krok 1: Szybki audyt obecnego projektu

Zanim cokolwiek zmienisz w kodzie, sprawdź poziom higieny pracy agentów w swoim repozytorium:

```bash
npx cdal audit
```

Komenda uruchamia się w ułamku sekundy, działa w 100% lokalnie (bez wysyłania kodu do sieci) i generuje raport HTML (`cdal-audit-report.html`) z punktacją 0–100 oraz listą rekomendacji.

---

## Krok 2: Inicjalizacja CDAL (`cdal init`)

W katalogu głównym projektu uruchom:

```bash
npx cdal init --preset typescript-strict --yes
```

Zostaną utworzone:
- `cdal.config.mjs` — główny plik konfiguracyjny
- `contracts/requirements.contract.mjs` — początkowy kontrakt wymagań
- `.claude/settings.json` — hooki PreToolUse blokujące zakazane operacje
- `AGENTS.md` — instrukcje dla agentów (Cursor, Codex, Antigravity)
- Skrypt weryfikacyjny w `package.json`: `"verify": "cdal verify"`

---

## Krok 3: Przejście pętli CDAL w 5 krokach

```
PLAN ──► CONTRACT ──► RED ──► GREEN ──► VERIFY ──► REVIEW ──► INTEGRATE
```

### 1. PLAN (Wymaganie)
Zdefiniuj wymaganie z jednoznacznym ID w `docs/workorders/` lub bezpośrednio w kontrakcie:
- ID: `AUTH-REQ-LOGIN`
- Tytuł: „Logowanie użytkownika adresem e-mail i hasłem”

### 2. CONTRACT (Kontrakt)
Otwórz okno kontraktowe i zaktualizuj plik `contracts/requirements.contract.mjs`:
```bash
npx cdal window open AUTH-01
# Edytuj kontrakt
npx cdal window close
npx cdal codegen
```

### 3. RED (Faza czerwona — test)
Rola `test-author` pisze test oznaczony tagiem wymagania:
```typescript
// test/auth.test.ts
import { describe, it, expect } from 'vitest';

describe('Auth Service', () => {
  // @REQ: AUTH-REQ-LOGIN
  it('odrzuca niepoprawne hasło z kodem 401', () => {
    // asercje...
  });
});
```

### 4. GREEN (Implementacja)
Rola `implementer` implementuje funkcjonalność w `src/`.
> **Ważne:** Jeśli implementer spróbuje zmodyfikować plik testowy, hook PreToolUse natychmiast zablokuje operację błędem:
> `[guard-paths / implementer] BLOCKED write to: test/auth.test.ts (denyTests: true)`

### 5. VERIFY (Deterministyczna bramka)
Uruchom pełny potok weryfikacyjny:
```bash
npx cdal verify
```
Wszystkie 6 kroków (walidacja niezmienników, zgodność typów codegen, typecheck, testy, macierz trace 100% i test mutacyjny selftest) muszą przejść na zielono.

---

## Podsumowanie i dalsze kroki
- Przejrzyj [Referencję CLI](/docs/cli-reference)
- Zobacz [Opis ról i hooków](/docs/concepts/roles)
- Przejrzyj [Case Study platformy B2B](/case-study/anonymized)

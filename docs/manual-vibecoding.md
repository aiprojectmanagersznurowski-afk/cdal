# 🚀 CDAL Vibecoding Manual — Quick Setup & Guardrails Guide

> **Target Audience:** Vibecoding enthusiasts, solopreneurs, indie hackers, and micro/small dev teams building products with AI tools (Cursor, Windsurf, Antigravity, Claude Code, Cline, Roo Code, Copilot).
> **Objective:** Vibe-code at 10x speed with AI **with seatbelts on** — zero regressions, zero test tampering, and zero architecture drift.

---

## 1. What You Need to Prepare (Prerequisites Checklist)

Before getting started, make sure you have the following ready:

### A. Runtime Environment
1. **Node.js**: Version 20.x LTS or higher.
   ```bash
   node -v # should return v20.x or v22.x
   ```
2. **Package Manager**: `pnpm` (recommended), `npm`, or `bun`.
   ```bash
   pnpm -v # or npm -v
   ```
3. **Git**: Initialized project repository.
   ```bash
   git status
   ```

### B. Your Preferred AI IDE / Tool
Choose your everyday AI environment:
- **Cursor** (*Composer* in *Agent* mode) — [cursor.com](https://cursor.com)
- **Windsurf** (*Cascade* mode) — [codeium.com/windsurf](https://codeium.com/windsurf)
- **Claude Code** (Anthropic CLI Agent) — `npm i -g @anthropic-ai/claude-code`
- **VS Code** with **Cline** or **Roo Code** extension
- **GitHub Copilot / Copilot Workspace**

### C. Recommended Models
- **Claude 3.7 Sonnet** or **Claude 3.5 Sonnet** (or **GPT-4o** / **o3-mini** for reasoning tasks).

---

## 2. 60-Second Installation in Your Project

You can add CDAL to an existing codebase or a brand new repository.

### Step 1: Initialize CDAL
In your project root directory, run:

```bash
npx @cdal/cli init
```

*What this does:*
1. Creates `contracts/` with a sample business state invariant contract (`app.contract.mjs`).
2. Creates `.cdal/` containing requirement state tracking (`requirements.json`).
3. Generates `AGENTS.md` and `.cursorrules` with unbreakable guardrail rules for AI agents.
4. Adds helper scripts to your `package.json` (`cdal:verify`, `cdal:validate`, `cdal:audit`).

### Step 2: Install Dev Dependencies
```bash
pnpm add -D @cdal/cli @cdal/core
# or: npm install -D @cdal/cli @cdal/core
```

### Step 3: Run Self-Test Verification
```bash
npx cdalkit selftest
```
You should see: `✔ Every quality gate rule is verified active and firing.`

---

## 3. Configuring Your AI Editor

Give your AI models clear, enforced rules so they never bypass requirements or alter tests.

### A. For Cursor Users (`.cursorrules` or `.cursor/rules`)
Create `.cursorrules` in your project root:

```markdown
# CDAL Rules for Cursor (Agent Mode)

You are an engineering assistant working in the CDAL (Contract-Driven Agentic Loop) framework.
Absolute rules you MUST NEVER violate:

1. RED PHASE: When asked for tests, write ONLY test files in the test directory.
   Every test MUST be tagged with: // @REQ: REQ-XXX
   Run the test suite and ensure it FAILS (RED).

2. GREEN PHASE: When asked for implementation, modify ONLY production code in `src/`.
   You are CATEGORICALLY FORBIDDEN from modifying test files or loosening assertions.
   Never introduce: @ts-ignore, @ts-expect-error, or "as any".

3. CONTRACTS: Business invariants and state machines live in `contracts/*.contract.mjs`.
   Never modify a contract unless the user explicitly opens a contract window.

4. VERIFICATION: Before finishing a task, run `npx cdalkit verify`.
```

### B. For Claude Code Users (`CLAUDE.md`)
Create `CLAUDE.md` in your project root:

```markdown
# CDAL Quality Gates for Claude Code

- Before writing code, verify requirements in contracts/
- Tests must be tagged with `// @REQ: <ID>`
- Never modify tests during implementation phase
- Run `npx cdalkit verify` before finishing turn
```

### C. For Windsurf Users (`.windsurfrules`)
Copy the `.cursorrules` content into `.windsurfrules`.

---

## 4. Daily Vibecoding Workflow (Loop Prompting)

Don't use vague prompts that lead to hallucinations. Use the simple 3-step loop:

### Step 1: Define Requirement (PLAN)
> **Your Prompt:**
> *"Add 10% discount logic for orders over $200. Requirement ID: REQ-DISCOUNT-01. Update contract in `contracts/order.contract.mjs`."*

### Step 2: Write Failing Test (RED)
> **Your Prompt:**
> *"Now write a test verifying REQ-DISCOUNT-01 in `tests/order.test.ts`. Tag it with `// @REQ: REQ-DISCOUNT-01`. Run it and confirm it FAILS (RED)."*

### Step 3: Implement Feature (GREEN)
> **Your Prompt:**
> *"Test failed as expected. Implement production logic in `src/order.ts` to make it pass GREEN. Do NOT touch any test files."*

### Step 4: Verify Quality (VERIFY)
Run in terminal:
```bash
npx cdalkit verify
```
Instantly validates 100% requirement traceability, zero `@ts-ignore` escapes, and zero contract drift.

---

## 5. Kickoff Prompt Template (Copy-Paste)

Paste this prompt when starting a new session in Cursor, Windsurf, Antigravity or Claude Code:

```text
Hi! In this repo we follow the CDAL (Contract-Driven Agentic Loop) methodology.
Our hard rules:
1. Every change starts with a requirement REQ-XXX and a contract in contracts/.
2. First, create a failing test tagged with // @REQ: REQ-XXX.
3. Then write production code. Never alter tests to hide implementation bugs.
4. Zero @ts-ignore, zero `as any`, zero linter suppressions.
5. Finish by running `npx cdalkit verify`.

Confirm you understand these rules and ask me for the first REQ-* requirement.
```

---

## 6. Community & Direct Support

- 📦 **GitHub Repository:** [github.com/aiprojectmanagersznurowski-afk/cdal_methodology](https://github.com/aiprojectmanagersznurowski-afk/cdal_methodology)
- 💡 **Free Local Repository Audit:** `npx cdalkit audit`
- 📬 **Contact & Feedback:** `kontakt@cdal.dev` (response within 24h)

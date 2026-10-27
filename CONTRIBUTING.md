# Contributing to CDAL Kit

Thank you for your interest in contributing to CDAL Kit!

## Core Development Principles

1. **One Task = One Branch = One PR:** Branch naming: `cdk/<ID>-short-description`.
2. **The CDAL Loop:**
   ```
   PLAN ──► CONTRACT ──► RED ──► GREEN ──► VERIFY ──► REVIEW ──► INTEGRATE
   ```
3. **Test-First Development:** Tests must exist before implementation code. Every requirement must be referenced with `@REQ: CDAL-REQ-*`.
4. **Deterministic Verification:** Before submitting a PR, `pnpm verify` must be clean (green exit code 0).
5. **No Runtime Dependencies in `@cdal/core`:** The core package must run on clean Node.js ESM without external runtime packages to guarantee ultra-fast hook execution (< 150 ms p95).

## Getting Started

```bash
# Clone the repository
git clone https://github.com/aiprojectmanagersznurowski-afk/cdal.git
cd cdal

# Ensure Node.js 22 LTS is used
nvm use

# Install dependencies
pnpm install

# Run verification suite
pnpm verify
```

## Pull Request Guidelines

Each PR must include:
- Clear description of the objective and fulfilled acceptance criteria.
- Verification status (`pnpm verify`).
- Trace matrix (`cdal trace --markdown`) once CDAL is self-hosted.

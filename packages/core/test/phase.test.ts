import { describe, expect, it } from 'vitest';
import { checkPhase } from '../src/index.js';

describe('Phase Diff Gate (@cdal/core phase)', () => {
  const protectedPaths = ['contracts/', 'src/generated/contracts/'];

  describe('RED phase (tests and docs only)', () => {
    // @REQ: CDAL-REQ-PHASE
    it('passes when only test and documentation files are changed', () => {
      const files = ['tests/feature.test.ts', 'docs/workorders/WO-001.md'];
      const result = checkPhase('red', { files, protectedPaths });
      expect(result.ok).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('fails when production code is modified', () => {
      const files = ['tests/feature.test.ts', 'src/feature.ts'];
      const result = checkPhase('red', { files, protectedPaths });
      expect(result.ok).toBe(false);
      expect(result.violations).toEqual(['src/feature.ts']);
      expect(result.why).toContain('In RED phase, only tests and documentation can be authored');
    });

    it('fails when no files are changed in RED phase', () => {
      const result = checkPhase('red', { files: [], protectedPaths });
      expect(result.ok).toBe(false);
    });
  });

  describe('GREEN phase (implementation only)', () => {
    it('passes when only implementation and documentation files are changed', () => {
      const files = ['src/feature.ts', 'app/page.tsx', 'docs/notes.md'];
      const result = checkPhase('green', { files, protectedPaths });
      expect(result.ok).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('fails when test files are modified in GREEN phase', () => {
      const files = ['src/feature.ts', 'src/feature.test.ts'];
      const result = checkPhase('green', { files, protectedPaths });
      expect(result.ok).toBe(false);
      expect(result.violations).toEqual(['src/feature.test.ts']);
      expect(result.why).toContain('tests and contracts are immutable specifications');
    });

    it('fails when contract files are modified in GREEN phase', () => {
      const files = ['src/feature.ts', 'contracts/requirements.contract.mjs'];
      const result = checkPhase('green', { files, protectedPaths });
      expect(result.ok).toBe(false);
      expect(result.violations).toEqual(['contracts/requirements.contract.mjs']);
    });
  });

  describe('CONTRACT phase (contracts and docs only)', () => {
    it('passes when only contracts and documentation are modified', () => {
      const files = ['contracts/requirements.contract.mjs', 'docs/requirements.md'];
      const result = checkPhase('contract', { files, protectedPaths });
      expect(result.ok).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('fails when implementation or test files are modified in CONTRACT phase', () => {
      const files = [
        'contracts/requirements.contract.mjs',
        'src/feature.ts',
        'tests/feature.test.ts',
      ];
      const result = checkPhase('contract', { files, protectedPaths });
      expect(result.ok).toBe(false);
      expect(result.violations).toEqual(['src/feature.ts', 'tests/feature.test.ts']);
    });
  });

  it('rejects invalid phase names', () => {
    expect(() => {
      // @ts-expect-error Testing invalid phase runtime check
      checkPhase('invalid-phase', { files: [] });
    }).toThrow('Invalid phase "invalid-phase"');
  });
});

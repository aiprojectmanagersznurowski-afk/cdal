import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CdalConfigError,
  defineConfig,
  loadConfig,
  resolveConfig,
  validateConfig,
} from '../src/index.js';

describe('CDAL Configuration Engine (CDK-E1-CONFIG)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdal-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // @REQ: CDAL-REQ-CONFIG
  it('defineConfig returns the input object identity', () => {
    const raw = { contractsDir: 'my-contracts' };
    expect(defineConfig(raw)).toBe(raw);
  });

  it('resolveConfig applies standard defaults for empty config', () => {
    const resolved = resolveConfig({});
    expect(resolved.contractsDir).toBe('contracts');
    expect(resolved.generated.ts).toBe('src/generated/contracts');
    expect(resolved.generated.docs).toBe('docs/generated');
    expect(resolved.protectedPaths).toContain('contracts/');
    expect(resolved.protectedPaths).toContain('src/generated/contracts/');
    expect(resolved.roles['spec-analyst']).toBeDefined();
    expect(resolved.roles.implementer?.denyTests).toBe(true);
    expect(resolved.bash.preset).toBe('safe-defaults');
    expect(resolved.verify).toContain('cdal selftest');
    expect(resolved.runtimes).toEqual(['claude-code', 'agents-md']);
  });

  it('resolves and merges built-in presets', () => {
    const resolved = resolveConfig({
      presets: ['typescript-strict', 'nextjs'],
    });

    expect(resolved.presets).toEqual(['typescript-strict', 'nextjs']);
    const ids = resolved.forbidden.map((r) => r.id);
    expect(ids).toContain('ts-ignore');
    expect(ids).toContain('as-any');
    expect(ids).toContain('skipped-test');
    expect(ids).toContain('nextjs-service-key-client');
  });

  describe('Validation error handling', () => {
    it('throws when root config is not an object', () => {
      expect(() => validateConfig(null)).toThrow(CdalConfigError);
      expect(() => validateConfig('invalid')).toThrow(CdalConfigError);
    });

    it('rejects absolute paths for contractsDir', () => {
      expect(() =>
        validateConfig({
          contractsDir: '/etc/contracts',
        }),
      ).toThrowError(/relative path within the workspace/);
    });

    it('rejects unknown presets with informative message', () => {
      expect(() =>
        validateConfig({
          presets: ['non-existent-preset'],
        }),
      ).toThrowError(/Unknown preset "non-existent-preset". Known presets are:/);
    });

    it('rejects invalid kind definitions missing an id', () => {
      expect(() =>
        validateConfig({
          kinds: [{} as unknown as { id: string }],
        }),
      ).toThrowError(/missing a required non-empty string "id"/);
    });

    it('rejects malformed globs in role write scopes', () => {
      expect(() =>
        validateConfig({
          roles: {
            'test-author': {
              write: ['src/[unclosed-bracket/*.ts'],
            },
          },
        }),
      ).toThrowError(/invalid glob or empty path/);
    });

    it('rejects invalid regex patterns in forbidden rules', () => {
      expect(() =>
        validateConfig({
          forbidden: [
            {
              id: 'broken-rule',
              re: '[unclosed-regex(',
              msg: 'broken',
            },
          ],
        }),
      ).toThrowError(/invalid regex in "re"/);
    });

    it('rejects empty command strings in verify', () => {
      expect(() =>
        validateConfig({
          verify: [''],
        }),
      ).toThrowError(/must be a non-empty command string/);
    });
  });

  describe('loadConfig file discovery', () => {
    it('returns default config when no file exists in cwd', async () => {
      const res = await loadConfig(tmpDir);
      expect(res.filepath).toBeNull();
      expect(res.config.contractsDir).toBe('contracts');
    });

    it('loads and resolves cdal.config.mjs from disk', async () => {
      const configFilePath = path.join(tmpDir, 'cdal.config.mjs');
      fs.writeFileSync(
        configFilePath,
        `export default {
          contractsDir: 'custom-contracts',
          presets: ['typescript-strict']
        };`,
        'utf8',
      );

      const res = await loadConfig(configFilePath);
      expect(res.filepath).toBe(configFilePath);
      expect(res.config.contractsDir).toBe('custom-contracts');
      expect(res.config.presets).toEqual(['typescript-strict']);
      expect(res.config.forbidden.some((r) => r.id === 'ts-ignore')).toBe(true);
    });

    it('throws when explicitly specified file does not exist', async () => {
      const missing = path.join(tmpDir, 'missing.config.mjs');
      await expect(loadConfig(missing)).rejects.toThrow(CdalConfigError);
    });
  });
});

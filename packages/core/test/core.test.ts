import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { VERSION, defineConfig } from '../src/index.js';

describe('@cdal/core foundation', () => {
  it('has zero runtime dependencies', () => {
    expect(packageJson.dependencies).toEqual({});
  });

  it('exports valid VERSION string', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('defineConfig returns input object identity', () => {
    const cfg = { contractsDir: 'contracts' };
    expect(defineConfig(cfg)).toBe(cfg);
  });
});

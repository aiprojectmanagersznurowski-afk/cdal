import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';

describe('cdal CLI package', () => {
  it('exposes executable binary configuration', () => {
    expect(packageJson.bin.cdal).toBe('./bin/cdal.mjs');
  });

  it('declares required core workspaces', () => {
    expect(packageJson.dependencies['@cdal/core']).toBe('workspace:*');
    expect(packageJson.dependencies['@cdal/kinds']).toBe('workspace:*');
    expect(packageJson.dependencies['@cdal/adapters']).toBe('workspace:*');
    expect(packageJson.dependencies['@cdal/audit']).toBe('workspace:*');
  });
});

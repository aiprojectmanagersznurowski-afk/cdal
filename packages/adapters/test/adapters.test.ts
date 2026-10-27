import { describe, expect, it } from 'vitest';
import { SUPPORTED_RUNTIMES, isSupportedRuntime } from '../src/index.js';

describe('@cdal/adapters foundation', () => {
  it('validates supported runtime identifiers', () => {
    expect(SUPPORTED_RUNTIMES).toContain('claude-code');
    expect(SUPPORTED_RUNTIMES).toContain('agents-md');
    expect(SUPPORTED_RUNTIMES).toContain('antigravity');
    expect(isSupportedRuntime('claude-code')).toBe(true);
    expect(isSupportedRuntime('unknown-runtime')).toBe(false);
  });
});

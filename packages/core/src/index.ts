/**
 * @cdal/core
 * Contract-Driven Agentic Loop - Core Engine
 * Zero runtime dependencies.
 */

export const VERSION = '0.1.0';

export * from './config/types.js';
export * from './config/presets.js';
export * from './config/validator.js';
export * from './config/loader.js';
export * from './kinds/types.js';
export * from './kinds/registry.js';
export * from './validate/types.js';
export * from './validate/runner.js';
export * from './codegen/types.js';
export * from './codegen/runner.js';
export * from './guard/contract-window.js';
export * from './guard/guard.js';
export * from './trace/types.js';
export * from './trace/scanner.js';
export * from './phase/types.js';
export * from './phase/phase.js';
export * from './selftest/types.js';
export * from './selftest/probes.js';
export * from './selftest/runner.js';

import type { CdalConfig } from './config/types.js';

/**
 * Type-safe configuration helper for cdal.config.mjs
 */
export function defineConfig(config: CdalConfig): CdalConfig {
  return config;
}

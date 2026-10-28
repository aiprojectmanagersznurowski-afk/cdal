import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCodegen, runValidation } from '@cdal/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveCommandKinds } from '../src/kinds.js';

describe('CLI commands use the kinds registered in cdal.config.mjs', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(tmpdir(), `cdal-kinds-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(dir, 'contracts'), { recursive: true });
    writeFileSync(join(dir, 'contracts/widgets.contract.mjs'), "export const WIDGETS = ['a'];\n");
    writeFileSync(
      join(dir, 'cdal.config.mjs'),
      `export default {
  kinds: [{
    id: 'widgets',
    files: ['widgets.contract.mjs'],
    load: (mod) => ({ widgets: mod.WIDGETS }),
    rules: [{ id: 'WIDGET-ALWAYS', severity: 'error', check: () => [{ ruleId: 'WIDGET-ALWAYS', severity: 'error', message: 'custom rule ran' }] }],
    emit: (data, ctx) => (ctx.target === 'ts' ? [{ path: 'widgets.ts', content: 'export const N = ' + data.widgets.length + ';\\n' }] : []),
    mutations: [],
  }],
};
`,
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // @REQ: CDAL-REQ-KINDS
  it('returns the configured kinds instead of the built-in ones', async () => {
    const kinds = await resolveCommandKinds(dir);
    expect(kinds.map((k) => k.id)).toEqual(['widgets']);
  });

  // @REQ: CDAL-REQ-KINDS
  it('falls back to the built-in kinds when the config registers none', async () => {
    rmSync(join(dir, 'cdal.config.mjs'));
    const kinds = await resolveCommandKinds(dir);
    expect(kinds.map((k) => k.id)).toEqual(['requirements', 'state-machine', 'policies']);
  });

  // @REQ: CDAL-REQ-KINDS
  it('validates and generates code for a custom kind', async () => {
    const kinds = await resolveCommandKinds(dir);

    const report = await runValidation({ cwd: dir, kinds });
    expect(report.findings.map((f) => f.ruleId)).toContain('WIDGET-ALWAYS');

    await runCodegen({ cwd: dir, kinds });
    const generated = join(dir, 'src/generated/contracts/widgets.ts');
    expect(existsSync(generated)).toBe(true);
    expect(readFileSync(generated, 'utf8')).toBe('export const N = 1;\n');
  });
});

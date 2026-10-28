import { type ContractKind, loadConfig } from '@cdal/core';
import { policies, requirements, stateMachine } from '@cdal/kinds';

/**
 * Contract kinds for validate/codegen: the ones registered in cdal.config.mjs
 * (built-in, CDAL Pro or custom), or the built-in kinds when the config registers none.
 */
export async function resolveCommandKinds(cwd: string = process.cwd()): Promise<ContractKind[]> {
  const { config } = await loadConfig(cwd);
  const configured = (config.kinds ?? []).filter(
    (kind): kind is ContractKind => typeof (kind as Partial<ContractKind>).load === 'function',
  );
  if (configured.length > 0) return configured;
  return [requirements(), stateMachine(), policies()] as ContractKind[];
}

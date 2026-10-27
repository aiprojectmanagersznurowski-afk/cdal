import { runMain as cittyRunMain, defineCommand } from 'citty';
import { auditCommand } from './commands/audit.js';
import { codegenCommand } from './commands/codegen.js';
import { doctorCommand } from './commands/doctor.js';
import { hookCommand } from './commands/hook.js';
import { initCommand } from './commands/init.js';
import { phaseCommand } from './commands/phase.js';
import { selftestCommand } from './commands/selftest.js';
import { syncCommand } from './commands/sync.js';
import { traceCommand } from './commands/trace.js';
import { validateCommand } from './commands/validate.js';
import { verifyCommand } from './commands/verify.js';
import { windowCommand } from './commands/window.js';

const main = defineCommand({
  meta: {
    name: 'cdal',
    version: '0.1.0',
    description: 'Contract-Driven Agentic Loop (CDAL) Quality Gates & Audit CLI',
  },
  subCommands: {
    init: initCommand,
    validate: validateCommand,
    codegen: codegenCommand,
    window: windowCommand,
    trace: traceCommand,
    phase: phaseCommand,
    selftest: selftestCommand,
    sync: syncCommand,
    verify: verifyCommand,
    doctor: doctorCommand,
    hook: hookCommand,
    audit: auditCommand,
  },
});

export function runMain() {
  cittyRunMain(main);
}

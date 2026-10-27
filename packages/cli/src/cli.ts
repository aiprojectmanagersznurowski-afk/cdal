import { createRequire } from 'node:module';
import { runMain as cittyRunMain, defineCommand } from 'citty';
import { auditCommand } from './commands/audit.js';
import { codegenCommand } from './commands/codegen.js';
import { doctorCommand } from './commands/doctor.js';
import { hookCommand } from './commands/hook.js';
import { initCommand } from './commands/init.js';
import { phaseCommand } from './commands/phase.js';
import { proCommand } from './commands/pro.js';
import { selftestCommand } from './commands/selftest.js';
import { syncCommand } from './commands/sync.js';
import { traceCommand } from './commands/trace.js';
import { validateCommand } from './commands/validate.js';
import { verifyCommand } from './commands/verify.js';
import { windowCommand } from './commands/window.js';

// Read the version from package.json so `--version` always matches the published package.
const { version } = createRequire(import.meta.url)('../package.json') as { version: string };

const main = defineCommand({
  meta: {
    name: 'cdal',
    version,
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
    pro: proCommand,
  },
});

export function runMain() {
  cittyRunMain(main);
}

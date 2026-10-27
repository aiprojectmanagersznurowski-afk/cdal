import { closeContractWindow, getContractWindowStatus, openContractWindow } from '@cdal/core';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export const windowCommand = defineCommand({
  meta: {
    name: 'window',
    description: 'Manage contract window for protected path modifications',
  },
  args: {
    action: {
      type: 'positional',
      description: 'Action to perform: open, close, status',
      required: true,
    },
    ticket: {
      type: 'positional',
      description: 'Ticket or reason ID (required for open)',
      required: false,
    },
    duration: {
      type: 'string',
      description: 'Window duration in minutes (default: 60)',
      default: '60',
    },
  },
  run({ args }) {
    const action = args.action.toLowerCase();

    if (action === 'open') {
      const ticket = args.ticket;
      if (!ticket) {
        console.error(
          pc.red(
            'Error: "cdal window open" requires a ticket or work order argument. Example: cdal window open WO-123',
          ),
        );
        process.exit(1);
      }
      const durationMinutes = Number.parseInt(args.duration, 10) || 60;
      const status = openContractWindow(ticket, { durationMinutes });
      console.log(pc.green(`✔ Contract window opened for ticket: ${pc.bold(status.ticket)}`));
      console.log(pc.dim(`  Expires at: ${status.expiresAt}`));
      return;
    }

    if (action === 'close') {
      closeContractWindow();
      console.log(pc.green('✔ Contract window closed. Protected paths are locked.'));
      return;
    }

    if (action === 'status') {
      const status = getContractWindowStatus();
      if (status.open) {
        console.log(pc.green(`Contract window is ${pc.bold('OPEN')}`));
        console.log(`  Ticket:     ${status.ticket ?? 'none'}`);
        console.log(`  Opened at:  ${status.openedAt ?? 'unknown'}`);
        console.log(`  Expires at: ${status.expiresAt ?? 'unknown'}`);
      } else {
        console.log(pc.yellow(`Contract window is ${pc.bold('CLOSED')}`));
      }
      return;
    }

    console.error(pc.red(`Unknown action "${action}". Available actions: open, close, status`));
    process.exit(1);
  },
});

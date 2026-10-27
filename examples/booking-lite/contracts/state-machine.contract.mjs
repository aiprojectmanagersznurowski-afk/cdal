/**
 * Booking Lifecycle State Machine Contract
 * @kind state-machine
 */

export const START_STATE = 'DRAFT';

export const STATES = [
  { id: 'DRAFT', name: 'Booking draft' },
  { id: 'REQUESTED', name: 'Awaiting approval' },
  { id: 'CONFIRMED', name: 'Confirmed booking' },
  { id: 'COMPLETED', name: 'Successfully completed', terminal: true },
  { id: 'CANCELLED', name: 'Cancelled', terminal: true },
  { id: 'REJECTED', name: 'Rejected by operator', terminal: true },
];

export const TRANSITIONS = [
  {
    id: 'T_SUBMIT',
    from: 'DRAFT',
    to: 'REQUESTED',
    action: 'submit',
    actor: 'customer',
    guards: ['G_SLOT_VALID'],
    req: ['BOOK-REQ-TRANSITION-REQUEST'],
  },
  {
    id: 'T_ABANDON',
    from: 'DRAFT',
    to: 'CANCELLED',
    action: 'abandon',
    actor: 'customer',
    req: ['BOOK-REQ-TRANSITION-CANCEL'],
  },
  {
    id: 'T_APPROVE',
    from: 'REQUESTED',
    to: 'CONFIRMED',
    action: 'approve',
    actor: 'operator',
    guards: ['G_NO_OVERLAP'],
    req: ['BOOK-REQ-TRANSITION-CONFIRM'],
  },
  {
    id: 'T_REJECT',
    from: 'REQUESTED',
    to: 'REJECTED',
    action: 'reject',
    actor: 'operator',
    req: ['BOOK-REQ-TRANSITION-REJECT'],
  },
  {
    id: 'T_CANCEL',
    from: 'CONFIRMED',
    to: 'CANCELLED',
    action: 'cancel',
    actor: 'customer',
    req: ['BOOK-REQ-TRANSITION-CANCEL'],
  },
  {
    id: 'T_COMPLETE',
    from: 'CONFIRMED',
    to: 'COMPLETED',
    action: 'complete',
    actor: 'system',
    req: ['BOOK-REQ-TRANSITION-COMPLETE'],
  },
];

export const GUARDS = [
  {
    id: 'G_SLOT_VALID',
    description: 'The selected slot is chronologically valid and within working hours',
  },
  {
    id: 'G_NO_OVERLAP',
    description: 'No time conflict with another active booking of the same resource',
  },
];

export const ACTORS = ['customer', 'operator', 'system'];

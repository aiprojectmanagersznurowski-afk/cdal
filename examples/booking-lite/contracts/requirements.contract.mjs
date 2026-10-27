/**
 * Requirements Contract for booking-lite
 * @kind requirements
 */

export const REQUIREMENTS = [
  {
    id: 'BOOK-REQ-INIT',
    statement:
      'The system creates a new booking with a unique identifier in the initial DRAFT state.',
    acceptance: ['The booking has a valid id', 'The initial booking state is DRAFT'],
    status: 'DONE',
    source: 'docs/SPEC.md#init',
  },
  {
    id: 'BOOK-REQ-SLOT-REQUIRED',
    statement: 'A booking must have valid start and end timestamps.',
    acceptance: ['startAt is defined and is a date', 'endAt is defined and is a date'],
    status: 'DONE',
    source: 'docs/SPEC.md#slot',
  },
  {
    id: 'BOOK-REQ-SLOT-ORDER',
    statement: 'The booking end time must be strictly later than the start time.',
    acceptance: ['endAt.getTime() > startAt.getTime()', 'An error is thrown when endAt <= startAt'],
    status: 'DONE',
    source: 'docs/SPEC.md#slot',
  },
  {
    id: 'BOOK-REQ-MIN-NOTICE',
    statement: 'A booking must be made at least 2 hours in advance.',
    acceptance: ['startAt - now >= 2 hours', 'Bookings made < 2h in advance are rejected'],
    status: 'DONE',
    source: 'docs/SPEC.md#policies',
  },
  {
    id: 'BOOK-REQ-MAX-DURATION',
    statement: 'A single booking cannot last longer than 8 hours.',
    acceptance: ['A duration <= 8h is allowed', 'Attempting to book > 8h fails validation'],
    status: 'DONE',
    source: 'docs/SPEC.md#policies',
  },
  {
    id: 'BOOK-REQ-MIN-DURATION',
    statement: 'A single booking must last at least 30 minutes.',
    acceptance: ['A duration >= 30 min is accepted', 'A duration < 30 min is rejected'],
    status: 'DONE',
    source: 'docs/SPEC.md#policies',
  },
  {
    id: 'BOOK-REQ-WORKING-HOURS',
    statement: 'Bookings may only start and end within opening hours (08:00 - 20:00).',
    acceptance: ['Start time >= 08:00', 'End time <= 20:00'],
    status: 'DONE',
    source: 'docs/SPEC.md#working-hours',
  },
  {
    id: 'BOOK-REQ-CUSTOMER-INFO',
    statement: 'A booking must include the customer name and a valid email address.',
    acceptance: ['customerName cannot be empty', 'customerEmail must be a valid email format'],
    status: 'DONE',
    source: 'docs/SPEC.md#customer',
  },
  {
    id: 'BOOK-REQ-TRANSITION-REQUEST',
    statement: 'A user can submit a complete booking for approval (DRAFT to REQUESTED transition).',
    acceptance: [
      'A valid booking changes state to REQUESTED',
      'The transition is only allowed from DRAFT',
    ],
    status: 'DONE',
    source: 'docs/SPEC.md#lifecycle',
  },
  {
    id: 'BOOK-REQ-TRANSITION-CONFIRM',
    statement: 'An operator approves a pending booking, changing its state to CONFIRMED.',
    acceptance: [
      'State changes from REQUESTED to CONFIRMED',
      'The booking receives an approval timestamp',
    ],
    status: 'DONE',
    source: 'docs/SPEC.md#lifecycle',
  },
  {
    id: 'BOOK-REQ-TRANSITION-REJECT',
    statement: 'An operator can reject a booking request with a reason.',
    acceptance: ['State changes from REQUESTED to REJECTED', 'The rejection reason is stored'],
    status: 'DONE',
    source: 'docs/SPEC.md#lifecycle',
  },
  {
    id: 'BOOK-REQ-TRANSITION-CANCEL',
    statement: 'The customer or an operator can cancel a booking.',
    acceptance: ['State changes to CANCELLED', 'Cancellation is possible from DRAFT or CONFIRMED'],
    status: 'DONE',
    source: 'docs/SPEC.md#cancellation',
  },
  {
    id: 'BOOK-REQ-CANCEL-POLICY',
    statement: 'Cancelling less than 24 hours before the start is flagged as late.',
    acceptance: [
      'Cancelling < 24h sets isLateCancellation: true',
      'Cancelling >= 24h incurs no fee',
    ],
    status: 'DONE',
    source: 'docs/SPEC.md#cancellation',
  },
  {
    id: 'BOOK-REQ-TRANSITION-COMPLETE',
    statement: 'A fulfilled booking moves to the final COMPLETED state.',
    acceptance: ['State changes from CONFIRMED to COMPLETED', 'The completion date is persisted'],
    status: 'DONE',
    source: 'docs/SPEC.md#lifecycle',
  },
  {
    id: 'BOOK-REQ-IMMUTABLE-FINAL',
    statement: 'The terminal states COMPLETED, CANCELLED and REJECTED are immutable.',
    acceptance: [
      'Attempting to change a terminal state throws an error',
      'No transitions are allowed from final states',
    ],
    status: 'DONE',
    source: 'docs/SPEC.md#lifecycle',
  },
  {
    id: 'BOOK-REQ-OVERLAP-PREVENTION',
    statement: 'The system prevents double-booking the same resource in overlapping slots.',
    acceptance: [
      'A booking for an occupied slot is blocked',
      'An adjacent, touching booking is allowed',
    ],
    status: 'DONE',
    source: 'docs/SPEC.md#overlap',
  },
];

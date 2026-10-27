import { describe, expect, it } from 'vitest';
import {
  approveBooking,
  assertNoOverlap,
  assertValidTransition,
  cancelBooking,
  completeBooking,
  createDraft,
  rejectBooking,
  submitBooking,
  validateCustomerInfo,
  validateSlot,
} from '../src/booking-service.js';

describe('Booking Service (CDAL Example: booking-lite)', () => {
  // Helper to construct a valid future date on working hours (e.g. tomorrow at 10:00)
  function createTestDates(hoursAhead = 24, durationHours = 2) {
    const now = new Date('2026-10-27T08:00:00Z');
    const startAt = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    // Align hours between 08:00 and 18:00
    startAt.setUTCHours(10, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
    return { now, startAt, endAt };
  }

  // @REQ: BOOK-REQ-INIT
  it('creates initial draft with generated UUID and DRAFT status', () => {
    const { now, startAt, endAt } = createTestDates(24, 2);
    const draft = createDraft({
      resourceId: 'court-1',
      customerName: 'Anna Kowalska',
      customerEmail: 'anna@example.com',
      startAt,
      endAt,
      now,
    });

    expect(draft.id).toBeDefined();
    expect(draft.status).toBe('DRAFT');
    expect(draft.customerName).toBe('Anna Kowalska');
    expect(draft.slot.startAt).toEqual(startAt);
    expect(draft.slot.endAt).toEqual(endAt);
  });

  // @REQ: BOOK-REQ-SLOT-REQUIRED
  it('enforces that startAt and endAt must be valid Date instances', () => {
    const now = new Date('2026-10-27T08:00:00Z');
    expect(() => validateSlot(null as unknown as Date, new Date(), now)).toThrow(
      /Valid startAt Date is required/,
    );
    expect(() => validateSlot(new Date(), undefined as unknown as Date, now)).toThrow(
      /Valid endAt Date is required/,
    );
  });

  // @REQ: BOOK-REQ-SLOT-ORDER
  it('throws error when endAt is not strictly after startAt', () => {
    const now = new Date('2026-10-27T08:00:00Z');
    const startAt = new Date('2026-10-28T10:00:00Z');
    const endAt = new Date('2026-10-28T09:00:00Z'); // before start!

    expect(() => validateSlot(startAt, endAt, now)).toThrow(
      /Booking end time must be strictly after start time/,
    );
  });

  // @REQ: BOOK-REQ-MIN-NOTICE
  it('enforces minimum 2-hour notice policy before booking start', () => {
    const now = new Date('2026-10-27T10:00:00Z');
    const tooSoonStart = new Date('2026-10-27T11:00:00Z'); // only 1h notice (policy requires 2h)
    const endAt = new Date('2026-10-27T12:00:00Z');

    expect(() => validateSlot(tooSoonStart, endAt, now)).toThrow(
      /Must be booked at least 2 hours in advance/,
    );
  });

  // @REQ: BOOK-REQ-MAX-DURATION
  it('enforces maximum duration limit (<= 8 hours)', () => {
    const now = new Date('2026-10-27T08:00:00Z');
    const startAt = new Date('2026-10-28T08:00:00Z');
    const tooLongEnd = new Date('2026-10-28T17:00:00Z'); // 9 hours duration

    expect(() => validateSlot(startAt, tooLongEnd, now)).toThrow(/exceeds maximum allowed 8 hours/);
  });

  // @REQ: BOOK-REQ-MIN-DURATION
  it('enforces minimum duration limit (>= 30 minutes)', () => {
    const now = new Date('2026-10-27T08:00:00Z');
    const startAt = new Date('2026-10-28T10:00:00Z');
    const tooShortEnd = new Date('2026-10-28T10:15:00Z'); // 15 mins

    expect(() => validateSlot(startAt, tooShortEnd, now)).toThrow(
      /below minimum allowed 30 minutes/,
    );
  });

  // @REQ: BOOK-REQ-WORKING-HOURS
  it('enforces facility operating hours (08:00 - 20:00)', () => {
    const now = new Date('2026-10-27T06:00:00');
    // Start too early (06:00)
    const earlyStart = new Date(2026, 9, 28, 6, 0, 0);
    const earlyEnd = new Date(2026, 9, 28, 8, 0, 0);
    expect(() => validateSlot(earlyStart, earlyEnd, now)).toThrow(
      /must fall within facility working hours/,
    );

    // End too late (22:00)
    const lateStart = new Date(2026, 9, 28, 19, 0, 0);
    const lateEnd = new Date(2026, 9, 28, 22, 0, 0);
    expect(() => validateSlot(lateStart, lateEnd, now)).toThrow(
      /must fall within facility working hours/,
    );
  });

  // @REQ: BOOK-REQ-CUSTOMER-INFO
  it('validates customer name and email format', () => {
    expect(() => validateCustomerInfo('', 'valid@example.com')).toThrow(
      /Customer name cannot be empty/,
    );
    expect(() => validateCustomerInfo('Jan', 'not-an-email')).toThrow(
      /Invalid customer email format/,
    );
  });

  // @REQ: BOOK-REQ-TRANSITION-REQUEST
  it('transitions booking from DRAFT to REQUESTED', () => {
    const { now, startAt, endAt } = createTestDates(24, 2);
    const draft = createDraft({
      resourceId: 'c1',
      customerName: 'Jan',
      customerEmail: 'jan@test.com',
      startAt,
      endAt,
      now,
    });

    const requested = submitBooking(draft);
    expect(requested.status).toBe('REQUESTED');
  });

  // @REQ: BOOK-REQ-TRANSITION-CONFIRM
  it('transitions booking from REQUESTED to CONFIRMED by operator', () => {
    const { now, startAt, endAt } = createTestDates(24, 2);
    const draft = createDraft({
      resourceId: 'c1',
      customerName: 'Jan',
      customerEmail: 'jan@test.com',
      startAt,
      endAt,
      now,
    });
    const requested = submitBooking(draft);
    const confirmed = approveBooking(requested);

    expect(confirmed.status).toBe('CONFIRMED');
  });

  // @REQ: BOOK-REQ-TRANSITION-REJECT
  it('transitions booking from REQUESTED to REJECTED with mandatory reason', () => {
    const { now, startAt, endAt } = createTestDates(24, 2);
    const draft = createDraft({
      resourceId: 'c1',
      customerName: 'Jan',
      customerEmail: 'jan@test.com',
      startAt,
      endAt,
      now,
    });
    const requested = submitBooking(draft);
    const rejected = rejectBooking(requested, 'Facility maintenance scheduled.');

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Facility maintenance scheduled.');
  });

  // @REQ: BOOK-REQ-TRANSITION-CANCEL
  it('transitions booking from CONFIRMED to CANCELLED', () => {
    const { now, startAt, endAt } = createTestDates(48, 2);
    const draft = createDraft({
      resourceId: 'c1',
      customerName: 'Jan',
      customerEmail: 'jan@test.com',
      startAt,
      endAt,
      now,
    });
    const confirmed = approveBooking(submitBooking(draft));
    const cancelled = cancelBooking(confirmed, now);

    expect(cancelled.status).toBe('CANCELLED');
  });

  // @REQ: BOOK-REQ-CANCEL-POLICY
  it('applies late cancellation policy when cancelled with < 24h notice', () => {
    const startAt = new Date('2026-10-28T14:00:00Z');
    const endAt = new Date('2026-10-28T16:00:00Z');

    // 48 hours notice -> free cancellation
    const earlyCancelNow = new Date('2026-10-26T14:00:00Z');
    const draft = createDraft({
      resourceId: 'c1',
      customerName: 'Jan',
      customerEmail: 'jan@test.com',
      startAt,
      endAt,
      now: earlyCancelNow,
    });
    const confirmed = approveBooking(submitBooking(draft));
    const freeCancellation = cancelBooking(confirmed, earlyCancelNow);
    expect(freeCancellation.isLateCancellation).toBe(false);

    // 12 hours notice -> late cancellation
    const lateCancelNow = new Date('2026-10-28T02:00:00Z');
    const lateCancellation = cancelBooking(confirmed, lateCancelNow);
    expect(lateCancellation.isLateCancellation).toBe(true);
  });

  // @REQ: BOOK-REQ-TRANSITION-COMPLETE
  it('transitions booking from CONFIRMED to COMPLETED after service delivery', () => {
    const { now, startAt, endAt } = createTestDates(24, 2);
    const draft = createDraft({
      resourceId: 'c1',
      customerName: 'Jan',
      customerEmail: 'jan@test.com',
      startAt,
      endAt,
      now,
    });
    const confirmed = approveBooking(submitBooking(draft));
    const completed = completeBooking(confirmed);

    expect(completed.status).toBe('COMPLETED');
  });

  // @REQ: BOOK-REQ-IMMUTABLE-FINAL
  it('blocks transitions from terminal states (COMPLETED, CANCELLED, REJECTED)', () => {
    expect(() => assertValidTransition('COMPLETED', 'CONFIRMED')).toThrow(
      /Terminal states are immutable/,
    );
    expect(() => assertValidTransition('CANCELLED', 'REQUESTED')).toThrow(
      /Terminal states are immutable/,
    );
    expect(() => assertValidTransition('REJECTED', 'DRAFT')).toThrow(
      /Terminal states are immutable/,
    );
  });

  // @REQ: BOOK-REQ-OVERLAP-PREVENTION
  it('prevents overlapping bookings for the same resource', () => {
    const { now, startAt, endAt } = createTestDates(24, 2);
    const booking1 = approveBooking(
      submitBooking(
        createDraft({
          id: 'b1',
          resourceId: 'room-101',
          customerName: 'Klient 1',
          customerEmail: 'k1@test.com',
          startAt,
          endAt,
          now,
        }),
      ),
    );

    // Overlapping slot (starts 1 hour before booking1 ends)
    const overlapStart = new Date(startAt.getTime() + 60 * 60 * 1000);
    const overlapEnd = new Date(endAt.getTime() + 60 * 60 * 1000);

    expect(() => assertNoOverlap('room-101', overlapStart, overlapEnd, [booking1])).toThrow(
      /Overlapping booking detected/,
    );

    // Non-overlapping slot (starts right after booking1 ends)
    expect(() =>
      assertNoOverlap('room-101', endAt, new Date(endAt.getTime() + 60 * 60 * 1000), [booking1]),
    ).not.toThrow();

    // Different resource is allowed simultaneously
    expect(() => assertNoOverlap('room-102', startAt, endAt, [booking1])).not.toThrow();
  });
});

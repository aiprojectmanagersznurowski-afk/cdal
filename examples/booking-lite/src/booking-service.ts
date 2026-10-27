import { POLICIES, type PolicyId } from './generated/contracts/policies.js';
import {
  START_STATE,
  STATES,
  type StateId,
  TRANSITIONS,
} from './generated/contracts/state-machine.js';
import type { Booking, CreateBookingDraftParams } from './types.js';

export function getPolicyValue(id: PolicyId): number {
  const policy = POLICIES.find((p) => p.id === id);
  if (!policy || !('value' in policy) || typeof policy.value !== 'number') {
    throw new Error(`Policy "${id}" not found or has no numeric value in contract.`);
  }
  return policy.value;
}

export function isTerminalState(status: StateId): boolean {
  const stateObj = STATES.find((s) => s.id === status);
  return Boolean(stateObj && 'terminal' in stateObj && stateObj.terminal);
}

export function assertValidTransition(from: StateId, to: StateId): void {
  if (isTerminalState(from)) {
    throw new Error(
      `Illegal transition from terminal state "${from}" to "${to}". Terminal states are immutable.`,
    );
  }

  const valid = TRANSITIONS.some((t) => t.from === from && t.to === to);
  if (!valid) {
    throw new Error(`Illegal state transition from "${from}" to "${to}".`);
  }
}

export function validateCustomerInfo(name: string, email: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Customer name cannot be empty.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error(`Invalid customer email format: "${email}".`);
  }
}

export function validateSlot(startAt: Date, endAt: Date, now: Date = new Date()): void {
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) {
    throw new Error('Valid startAt Date is required.');
  }
  if (!(endAt instanceof Date) || Number.isNaN(endAt.getTime())) {
    throw new Error('Valid endAt Date is required.');
  }

  // BOOK-REQ-SLOT-ORDER
  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error('Booking end time must be strictly after start time.');
  }

  // BOOK-REQ-MIN-NOTICE
  const minNoticeHours = getPolicyValue('min_notice_hours');
  const noticeMs = startAt.getTime() - now.getTime();
  const minNoticeMs = minNoticeHours * 60 * 60 * 1000;
  if (noticeMs < minNoticeMs) {
    throw new Error(
      `Booking notice is insufficient. Must be booked at least ${minNoticeHours} hours in advance.`,
    );
  }

  // BOOK-REQ-MAX-DURATION & MIN-DURATION
  const durationMs = endAt.getTime() - startAt.getTime();
  const maxDurationHours = getPolicyValue('max_duration_hours');
  const minDurationMinutes = getPolicyValue('min_duration_minutes');

  if (durationMs > maxDurationHours * 60 * 60 * 1000) {
    throw new Error(`Booking duration exceeds maximum allowed ${maxDurationHours} hours.`);
  }
  if (durationMs < minDurationMinutes * 60 * 1000) {
    throw new Error(`Booking duration is below minimum allowed ${minDurationMinutes} minutes.`);
  }

  // BOOK-REQ-WORKING-HOURS
  const openingHour = getPolicyValue('opening_hour');
  const closingHour = getPolicyValue('closing_hour');

  const startHour = startAt.getHours();
  const endHour = endAt.getHours() + (endAt.getMinutes() > 0 ? 1 : 0);

  if (startHour < openingHour || endHour > closingHour) {
    throw new Error(
      `Booking must fall within facility working hours (${openingHour}:00 - ${closingHour}:00).`,
    );
  }
}

export function assertNoOverlap(
  resourceId: string,
  startAt: Date,
  endAt: Date,
  existingBookings: Booking[] = [],
  excludeBookingId?: string,
): void {
  for (const b of existingBookings) {
    if (b.resourceId !== resourceId) continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.status === 'CANCELLED' || b.status === 'REJECTED') continue;

    const bStart = b.slot.startAt.getTime();
    const bEnd = b.slot.endAt.getTime();
    const newStart = startAt.getTime();
    const newEnd = endAt.getTime();

    // Overlap condition: start < other.end && end > other.start
    if (newStart < bEnd && newEnd > bStart) {
      throw new Error(
        `Overlapping booking detected for resource "${resourceId}" with booking [${b.id}].`,
      );
    }
  }
}

export function createDraft(params: CreateBookingDraftParams): Booking {
  const now = params.now ?? new Date();
  validateCustomerInfo(params.customerName, params.customerEmail);
  validateSlot(params.startAt, params.endAt, now);

  const id = params.id ?? `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    resourceId: params.resourceId,
    customerName: params.customerName.trim(),
    customerEmail: params.customerEmail.trim(),
    slot: {
      startAt: params.startAt,
      endAt: params.endAt,
    },
    status: START_STATE,
    createdAt: now,
    updatedAt: now,
  };
}

export function submitBooking(booking: Booking, existingBookings: Booking[] = []): Booking {
  assertValidTransition(booking.status, 'REQUESTED');
  assertNoOverlap(
    booking.resourceId,
    booking.slot.startAt,
    booking.slot.endAt,
    existingBookings,
    booking.id,
  );

  return {
    ...booking,
    status: 'REQUESTED',
    updatedAt: new Date(),
  };
}

export function approveBooking(booking: Booking, existingBookings: Booking[] = []): Booking {
  assertValidTransition(booking.status, 'CONFIRMED');
  assertNoOverlap(
    booking.resourceId,
    booking.slot.startAt,
    booking.slot.endAt,
    existingBookings,
    booking.id,
  );

  return {
    ...booking,
    status: 'CONFIRMED',
    updatedAt: new Date(),
  };
}

export function rejectBooking(booking: Booking, reason: string): Booking {
  assertValidTransition(booking.status, 'REJECTED');
  if (!reason || reason.trim().length === 0) {
    throw new Error('Rejection reason is required.');
  }

  return {
    ...booking,
    status: 'REJECTED',
    rejectionReason: reason.trim(),
    updatedAt: new Date(),
  };
}

export function cancelBooking(booking: Booking, now: Date = new Date()): Booking {
  assertValidTransition(booking.status, 'CANCELLED');

  const freeNoticeHours = getPolicyValue('free_cancellation_hours');
  const noticeMs = booking.slot.startAt.getTime() - now.getTime();
  const isLate = noticeMs < freeNoticeHours * 60 * 60 * 1000;

  return {
    ...booking,
    status: 'CANCELLED',
    isLateCancellation: isLate,
    updatedAt: now,
  };
}

export function completeBooking(booking: Booking): Booking {
  assertValidTransition(booking.status, 'COMPLETED');

  return {
    ...booking,
    status: 'COMPLETED',
    updatedAt: new Date(),
  };
}

import type { StateId } from './generated/contracts/state-machine.js';

export type BookingStatus = StateId;

export interface BookingSlot {
  startAt: Date;
  endAt: Date;
}

export interface Booking {
  id: string;
  resourceId: string;
  customerName: string;
  customerEmail: string;
  slot: BookingSlot;
  status: BookingStatus;
  rejectionReason?: string;
  isLateCancellation?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDraftParams {
  id?: string;
  resourceId: string;
  customerName: string;
  customerEmail: string;
  startAt: Date;
  endAt: Date;
  now?: Date;
}

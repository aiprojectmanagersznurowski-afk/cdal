/**
 * Booking Policies Contract
 * @kind policies
 */

export const POLICIES = [
  {
    id: 'min_notice_hours',
    scope: 'booking',
    description: 'Minimum notice before the booking starts',
    unit: 'hours',
    value: 2,
    req: ['BOOK-REQ-MIN-NOTICE'],
  },
  {
    id: 'max_duration_hours',
    scope: 'booking',
    description: 'Maximum allowed duration of a single booking',
    unit: 'hours',
    value: 8,
    req: ['BOOK-REQ-MAX-DURATION'],
  },
  {
    id: 'min_duration_minutes',
    scope: 'booking',
    description: 'Minimum duration of a single booking',
    unit: 'minutes',
    value: 30,
    req: ['BOOK-REQ-MIN-DURATION'],
  },
  {
    id: 'free_cancellation_hours',
    scope: 'booking',
    description: 'Minimum notice for free booking cancellation',
    unit: 'hours',
    value: 24,
    req: ['BOOK-REQ-CANCEL-POLICY'],
  },
  {
    id: 'opening_hour',
    scope: 'facility',
    description: 'Facility opening time (08:00)',
    unit: 'hour_of_day',
    value: 8,
    req: ['BOOK-REQ-WORKING-HOURS'],
  },
  {
    id: 'closing_hour',
    scope: 'facility',
    description: 'Facility closing time (20:00)',
    unit: 'hour_of_day',
    value: 20,
    req: ['BOOK-REQ-WORKING-HOURS'],
  },
  {
    id: 'cancellation_fee_tiers',
    scope: 'booking',
    description: 'Booking cancellation fee bands',
    unit: 'hours',
    bands: [
      { name: 'standard', max: 24 },
      { name: 'free', max: 48 },
    ],
    req: ['BOOK-REQ-CANCEL-POLICY'],
  },
];

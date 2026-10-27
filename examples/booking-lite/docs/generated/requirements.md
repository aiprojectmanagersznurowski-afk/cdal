# System Requirements Matrix

| ID | Status | Priority | Statement | Acceptance Criteria |
|---|---|---|---|---|
| **BOOK-REQ-CANCEL-POLICY** | `DONE` | NORMAL | Cancelling less than 24 hours before the start is flagged as late. | 1. Cancelling < 24h sets isLateCancellation: true<br>2. Cancelling >= 24h incurs no fee |
| **BOOK-REQ-CUSTOMER-INFO** | `DONE` | NORMAL | A booking must include the customer name and a valid email address. | 1. customerName cannot be empty<br>2. customerEmail must be a valid email format |
| **BOOK-REQ-IMMUTABLE-FINAL** | `DONE` | NORMAL | The terminal states COMPLETED, CANCELLED and REJECTED are immutable. | 1. Attempting to change a terminal state throws an error<br>2. No transitions are allowed from final states |
| **BOOK-REQ-INIT** | `DONE` | NORMAL | The system creates a new booking with a unique identifier in the initial DRAFT state. | 1. The booking has a valid id<br>2. The initial booking state is DRAFT |
| **BOOK-REQ-MAX-DURATION** | `DONE` | NORMAL | A single booking cannot last longer than 8 hours. | 1. A duration <= 8h is allowed<br>2. Attempting to book > 8h fails validation |
| **BOOK-REQ-MIN-DURATION** | `DONE` | NORMAL | A single booking must last at least 30 minutes. | 1. A duration >= 30 min is accepted<br>2. A duration < 30 min is rejected |
| **BOOK-REQ-MIN-NOTICE** | `DONE` | NORMAL | A booking must be made at least 2 hours in advance. | 1. startAt - now >= 2 hours<br>2. Bookings made < 2h in advance are rejected |
| **BOOK-REQ-OVERLAP-PREVENTION** | `DONE` | NORMAL | The system prevents double-booking the same resource in overlapping slots. | 1. A booking for an occupied slot is blocked<br>2. An adjacent, touching booking is allowed |
| **BOOK-REQ-SLOT-ORDER** | `DONE` | NORMAL | The booking end time must be strictly later than the start time. | 1. endAt.getTime() > startAt.getTime()<br>2. An error is thrown when endAt <= startAt |
| **BOOK-REQ-SLOT-REQUIRED** | `DONE` | NORMAL | A booking must have valid start and end timestamps. | 1. startAt is defined and is a date<br>2. endAt is defined and is a date |
| **BOOK-REQ-TRANSITION-CANCEL** | `DONE` | NORMAL | The customer or an operator can cancel a booking. | 1. State changes to CANCELLED<br>2. Cancellation is possible from DRAFT or CONFIRMED |
| **BOOK-REQ-TRANSITION-COMPLETE** | `DONE` | NORMAL | A fulfilled booking moves to the final COMPLETED state. | 1. State changes from CONFIRMED to COMPLETED<br>2. The completion date is persisted |
| **BOOK-REQ-TRANSITION-CONFIRM** | `DONE` | NORMAL | An operator approves a pending booking, changing its state to CONFIRMED. | 1. State changes from REQUESTED to CONFIRMED<br>2. The booking receives an approval timestamp |
| **BOOK-REQ-TRANSITION-REJECT** | `DONE` | NORMAL | An operator can reject a booking request with a reason. | 1. State changes from REQUESTED to REJECTED<br>2. The rejection reason is stored |
| **BOOK-REQ-TRANSITION-REQUEST** | `DONE` | NORMAL | A user can submit a complete booking for approval (DRAFT to REQUESTED transition). | 1. A valid booking changes state to REQUESTED<br>2. The transition is only allowed from DRAFT |
| **BOOK-REQ-WORKING-HOURS** | `DONE` | NORMAL | Bookings may only start and end within opening hours (08:00 - 20:00). | 1. Start time >= 08:00<br>2. End time <= 20:00 |

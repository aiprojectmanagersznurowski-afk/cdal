# System Policies Reference

| Policy ID | Scope | Unit | Value / Bands | Linked Reqs |
|---|---|---|---|---|
| **cancellation_fee_tiers** | booking | `hours` | standard (<= 24), free (<= 48) | `BOOK-REQ-CANCEL-POLICY` |
| **closing_hour** | facility | `hour_of_day` | 20 | `BOOK-REQ-WORKING-HOURS` |
| **free_cancellation_hours** | booking | `hours` | 24 | `BOOK-REQ-CANCEL-POLICY` |
| **max_duration_hours** | booking | `hours` | 8 | `BOOK-REQ-MAX-DURATION` |
| **min_duration_minutes** | booking | `minutes` | 30 | `BOOK-REQ-MIN-DURATION` |
| **min_notice_hours** | booking | `hours` | 2 | `BOOK-REQ-MIN-NOTICE` |
| **opening_hour** | facility | `hour_of_day` | 8 | `BOOK-REQ-WORKING-HOURS` |

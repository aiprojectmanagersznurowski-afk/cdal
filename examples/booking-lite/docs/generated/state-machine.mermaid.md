# State Machine Diagram

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> REQUESTED: submit
  DRAFT --> CANCELLED: abandon
  REQUESTED --> CONFIRMED: approve
  REQUESTED --> REJECTED: reject
  CONFIRMED --> CANCELLED: cancel
  CONFIRMED --> COMPLETED: complete
  COMPLETED --> [*]
  CANCELLED --> [*]
  REJECTED --> [*]
```

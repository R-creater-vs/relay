# RELAY — Prior Art, Intellectual Heritage & Technical Differentiation

## 1. Prior Art in Local-First & Distributed CRDTs

### 1.1. Automerge
- **Reference:** Kleppmann, M., & Beresford, A. R. (2017). *A Conflict-Free Replicated JSON Datatype.* IEEE Transactions on Parallel and Distributed Systems.
- **Reference:** van der Linde, A., Rito, H., & Kleppmann, M. (2020–2024). *Automerge 3.0 / Automerge-wasm.* Ink & Switch.
- **Contribution:** Standardized document-oriented JSON CRDT with operation-based change history, column-oriented binary serialization, and peer-to-peer sync protocol with multi-value register conflicts (`getConflicts`).
- **How RELAY builds on this:** RELAY uses `@automerge/automerge` v3.5.0 as the authentic ground-truth CRDT engine. RELAY implements zero fake conflict cards; every conflict rendered in the UI is directly retrieved from `Automerge.getConflicts()`.

### 1.2. Yjs
- **Reference:** Nicolaescu, P., Jahns, K., Derntl, M., & Klamma, R. (2015). *Near real-time collaborative editing using Yjs.*
- **Contribution:** High-performance collaborative text editing CRDT with state vector synchronization.

### 1.3. Local-First Software Manifesto
- **Reference:** Kleppmann, M., Wiggins, A., van Hardenberg, P., & McGranaghan, M. (2019). *Local-first software: You own your data, in spite of the cloud.* ACM Onward!
- **Core Principles:** Seven ideals including user data ownership, seamless offline work, cross-device synchronization, and transparent conflict resolution.

---

## 2. Technical Differentiation: The Novelty of RELAY

Standard collaborative boards (Trello, Jira, Notion) either:
1. Hide offline conflicts using naive Last-Writer-Wins (LWW) based on client clock timestamps, silently erasing a coordinator's work.
2. Throw blocking modal merge errors that freeze user interactions.

**RELAY provides two foundational innovations:**

1. **Causal Handoff Acknowledgment Validity:**
   - Rather than treating a task handoff as a static timestamp or boolean checkbox, RELAY binds acknowledgments to the **exact causal document state** observed by the coordinator.
   - When an offline teammate changes the task owner or status and reconnects, both replicas converge deterministically, but the prior acknowledgment becomes **immediately stale**.
   - An intervening edit that was changed and changed back still marks the acknowledgment stale if unreviewed changes occurred.
   - Unrelated edits to other tasks do NOT cause false invalidations.

2. **Controlled Dual-Replica Laboratory with Packet Bridge:**
   - Instead of hiding network transport behind an opaque WebSocket, RELAY puts the **entire transport bridge on screen**.
   - Users can pause the bridge, make concurrent offline edits in both panels (Meera in Cobalt, Arjun in Terracotta), inspect queued binary envelopes, inject packet duplicates or reordering, and watch the exact sync iterations until quiescence.

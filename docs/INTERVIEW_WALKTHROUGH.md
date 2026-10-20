# RELAY: Senior Distributed Systems & Local-First Interview Walkthrough

This document prepares you for technical interviews for Senior/Staff Distributed Systems, Local-First Architecture, and Real-Time Collaboration roles (e.g. Figma, Linear, Notion, Apple, Ink & Switch).

---

## 1. Convergence vs Agreement in Distributed Systems

### Q: "What is the difference between convergence and semantic agreement in a CRDT?"
**Answer:**
> "They exist at two entirely different layers of the system:
> - **Convergence (Mathematical Property):** In a CRDT (like Automerge or Yjs), convergence means that any two replicas that have received the same set of operations will deterministically materialize into the identical data state, regardless of the order or network routing in which operations arrived.
> - **Agreement (Human / Semantic State):** If Coordinator A assigns a task to 'Meera' while Coordinator B assigns it to 'Arjun', Automerge converges mathematically by deterministically selecting one value (e.g. via actor ID tie-breaking). However, the humans do NOT agree! If the system silently hides Arjun's assignment, two people think they are doing the same job.
> - RELAY distinguishes convergence from agreement: Automerge ensures identical document states, while RELAY's **Conflict Inbox** exposes the multi-value conflict so coordinators can negotiate an explicit resolution."

---

## 2. Causal Order vs Wall-Clock Order

### Q: "Why is wall-clock time unreliable for resolving concurrent edits in offline-first applications?"
**Answer:**
> "Wall-clock timestamps (e.g., `Date.now()`) suffer from clock skew, drift, and malicious or uncalibrated device clocks:
> 1. A coordinator whose phone clock is 5 minutes slow would have their edits systematically clobbered by someone whose phone clock is 5 minutes fast, even if the slow phone made their edit hours later.
> 2. More fundamentally, physical time does not capture **causal history**. If two devices are disconnected, their operations are mathematically concurrent (neither saw the other).
> 3. Automerge uses a causal graph (Directed Acyclic Graph of change hashes). If change $Y$ has change $X$ in its dependencies, $X \prec Y$ ($X$ causally precedes $Y$). If neither change is an ancestor of the other, they are concurrent, regardless of what the user's system clock said."

---

## 3. The Causal Acknowledgment Validity Predicate

### Q: "How does RELAY's handoff acknowledgment work, and why isn't a content hash comparison sufficient?"
**Answer:**
> "A handoff acknowledgment represents: *'Coordinator X saw and took responsibility for task T in state S.'*
> 
> A naive implementation might just compare `contentHash(current) === contentHash(acknowledged)`. But consider this failure mode:
> 1. Meera acknowledges T1 (status: 'todo').
> 2. Disconnected Arjun changes T1 to 'blocked' (e.g., waiting on city permit).
> 3. Later, Arjun changes T1 back to 'todo' because the permit arrived.
> 4. If you only check content hash, the status is 'todo' again, so a naive check would say the acknowledgment is still valid!
> 5. But Meera never knew the task was blocked and never reviewed the permit notes!
> 6. RELAY enforces **Causal Ancestry Strictness**: we verify that current document heads descend strictly from the acknowledged state without intervening unreviewed causal branches on relevant task fields."

---

## 4. Multi-Value Registers & Automerge Conflict Semantics

### Q: "How does Automerge store and expose conflicts under the hood?"
**Answer:**
> "In Automerge, maps and scalar properties are implemented as Multi-Value Registers (MVR):
> - When an operation writes to `tasks.T1.ownerId`, it references the prior operation IDs it is overwriting.
> - If an incoming concurrent operation overwrites the same prior operation without referencing the peer's operation, Automerge retains both operations in its internal B-tree.
> - Calling `Automerge.getConflicts(task, 'ownerId')` returns a dictionary mapping each concurrent `OpID` to its written value: `{ '44@1111...': 'Meera', '44@2222...': 'Arjun' }`.
> - The application UI can inspect every concurrent value without custom conflict-tracking heuristics."

---

## 5. Local Storage & Durability

### Q: "Why shouldn't you serialize CRDT documents using JSON.stringify for IndexedDB storage?"
**Answer:**
> "Calling `JSON.stringify(doc)` serializes only the *materialized snapshot* at that instant; it discards the entire causal operation graph, edit history, and multi-value conflict registers!
> If you load that JSON back on another day, the document loses its history, cannot perform incremental sync with peers, and turns future concurrent edits into corrupted overwrite errors.
> Automerge provides `Automerge.save(doc)` which outputs a compressed, column-oriented binary representation (`Uint8Array`) containing the complete DAG of operations. RELAY stores these raw byte arrays in IndexedDB."

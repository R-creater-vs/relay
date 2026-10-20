# RELAY — Synchronization & Acknowledgment Contract

**Document Version:** 1.0.0  
**Installed CRDT Library:** `@automerge/automerge` v3.5.0  
**Specification:** Local-First Two-Replica Handoff with Causal Acknowledgment Validity

---

## 1. Actor Identity & Two-Replica Architecture

1. **Deterministic Actor IDs:**
   - **Replica A (Meera):** `11111111111111111111111111111111` (Cobalt theme: `#2459A6`)
   - **Replica B (Arjun):** `22222222222222222222222222222222` (Terracotta theme: `#AE533B`)
2. **Independent Local Namespaces:**
   - Each replica maintains its own isolated IndexedDB persistence namespace (`relay-storage-replica-a` vs `relay-storage-replica-b`).
   - A disconnected replica NEVER receives peer state through shared global memory, storage events, or BroadcastChannel.
   - All state exchanges pass strictly through the controlled simulated transport.

---

## 2. Document Data Contract

```typescript
export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export interface Note {
  noteId: string;
  authorId: string;
  text: string;
  createdAtMs: number;
}

export interface Task {
  taskId: string;
  title: string;
  ownerId: string;
  status: TaskStatus;
  archived: boolean;
  notesById: Record<string, Note>;
}

export interface ResolutionRecord {
  resolutionId: string;
  taskId: string;
  field: 'ownerId' | 'status' | 'title';
  observedConflictIds: string[];
  competingValues: string[];
  selectedValue: string;
  resolverId: string;
  reason: string;
  resolvedAtMs: number;
}

export interface HandoffAcknowledgment {
  ackId: string;
  taskId: string;
  owner: string;
  status: TaskStatus;
  latestNoteId: string | null;
  relevantKnownChangeHeads: string[];
  acknowledgedByIdentity: string;
  acknowledgedAtMs: number;
  contentDigest: string;
}

export interface RelayDoc {
  tasks: Record<string, Task>;
  resolutions: Record<string, ResolutionRecord>;
  acknowledgments: Record<string, HandoffAcknowledgment>;
}
```

---

## 3. Conflict Detection & Resolution Semantics

1. **Concurrent Field Edits:**
   - When Replica A changes `ownerId` to `"Meera"` and Replica B concurrently changes `ownerId` to `"Arjun"` while disconnected, Automerge detects a multi-value conflict via:
     ```typescript
     const conflicts = Automerge.getConflicts(task, 'ownerId');
     // Returns { [changeOpId: string]: string } with both 'Meera' and 'Arjun'
     ```
2. **Deterministic Convergence vs Conflict Elimination:**
   - Automerge deterministically renders a single value in `task.ownerId` (e.g. by sorting actor IDs).
   - **Crucial Rule:** The conflict is NOT eliminated. Both competing alternatives survive in the document history.
   - RELAY surfaces all surviving alternatives in the **Conflict Inbox**.
3. **Explicit Human Resolution:**
   - A conflict is only resolved when an authorized user selects a value (or enters a negotiated compromise) and commits a new document change with a `ResolutionRecord`.
   - The resolution explicitly supersedes the observed competing change IDs.

---

## 4. The Signature Mechanism: Causal Acknowledgment Validity

An acknowledgment is not a decorative badge. It represents a strict statement:  
*“Coordinator X acknowledged task T in exact state S.”*

### 4.1. The Validity Predicate
Given an acknowledgment $\text{Ack}$ and current merged task $T$:
$$\text{IsValid}(\text{Ack}, T) \iff \text{All of the following hold:}$$

1. **Content Matching:**
   $$T.\text{ownerId} = \text{Ack}.\text{owner} \quad \land \quad T.\text{status} = \text{Ack}.\text{status}$$
2. **Zero Unresolved Relevant Conflicts:**
   $$\text{Automerge.getConflicts}(T, \text{'ownerId'}) \text{ is empty} \quad \land \quad \text{Automerge.getConflicts}(T, \text{'status'}) \text{ is empty}$$
3. **Causal Ancestry Strictness (Intervening Relevant Edits):**
   - The document heads when the acknowledgment was signed must be an ancestor of the current document heads.
   - If an intervening change modified a relevant field (even if later changed back to the identical string), the acknowledgment is declared **Stale (Intervening Relevant History)**.
   - Edits to unrelated tasks (e.g. $T2$) do NOT invalidate acknowledgments for $T1$.

---

## 5. Controlled Transport Simulator

The transport bridge models real-world asynchronous packet delivery:
- **Modes:** Connected (automatic synchronous or delayed), Disconnected (all outbound packets queued in FIFO outbox).
- **Packet Invariant:** `TransportEnvelope` carries raw serialized binary sync messages (`Uint8Array`) produced by `Automerge.generateSyncMessage()`.
- **Fault Injections:**
  - `duplicate-delivery`: Replays an already delivered envelope to verify idempotent sync state handling.
  - `delayed-delivery`: Holds envelopes in transit until triggered.
  - `reordered-delivery`: Swaps queue sequence.
  - `drain-until-quiescent`: Loops until both outbox queues are empty and `generateSyncMessage` produces `null`.

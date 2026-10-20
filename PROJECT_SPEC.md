# RELAY — Causal Handoff Acknowledgments

Portfolio expansion 04 of 07 · Gemini 3.8 Flash / Antigravity · Self-contained build specification

**Idea:** An offline handoff board whose acknowledgments are tied to the exact task state a person saw and become stale when relevant changes arrive.

**Recruiter-facing moment:** “Both people edited the same task offline. The system converged without pretending their disagreement disappeared.”

---
## BUILD PROMPT

Implement **RELAY**, a local-first handoff system whose acknowledgments become stale when relevant unseen changes arrive. Build two independently persisted replicas, a controlled synchronization transport, and an inspectable conflict workflow. The acknowledgment-validity mechanism specified below is mandatory.

I am a BCA Data Analytics student who also builds full-stack products. My existing planning app is not a distributed-state demonstration. RELAY must add offline persistence, causal concurrent changes, synchronization, and conflict UX. It must not become another to-do list with a fake “offline” badge.

### 1. Scope, costs, and stack

Use React, strict TypeScript, Vite, IndexedDB, and Automerge. Use Automerge's documented conflict/sync APIs rather than writing a purported production CRDT from scratch. Verify the installed version with a small executable spike before designing the integration.

Core experience is a deterministic **two-replica lab in one browser**, each replica with its own document, actor identity, local persistence namespace, and outgoing message queue. A simulated transport can pause, delay, duplicate, and reorder delivery. A second-browser-tab transport is a later extension only after the lab works.

No paid API, hosted relay, remote account, runtime LLM, external analytics, or Docker. All sample identities and tasks are fictional. Do not imply two physical devices synchronize over the internet without a server.

Create domain, storage, transport, sync, UI, and tests as separate modules. Keep a single source of derived conflict status. Preserve unrelated files and inspect project instructions. Lock dependencies; maintain `BUILD_STATUS.md` with actual experiments and next actions.

### 2. Product problem

At a campus event, two coordinators lose connectivity and both reassign an equipment task. Silent last-writer-wins can hide an unresolved operational disagreement. RELAY lets both continue working, then reveals the conflict in context and records an explicit resolution.

Support tasks with title, status, owner, notes, and archived flag. Use stable task IDs and a map keyed by ID. Core edits are scalar title/owner/status and append-only notes; collaborative rich-text editing is out of scope.

Board statuses: todo, in-progress, blocked, done. Do not derive “correct ownership” from timestamp order or the person with the lexicographically larger actor ID.

### 3. Data contract

```text
Task: taskId, title, ownerId, status, archived, notesById
Note: noteId, authorId, text, createdAtLabel
ResolutionRecord: resolutionId, taskId, field, observedConflictIds,
                  selectedValue, resolverId, reason, createdAtLabel
ReplicaMetadata: replicaId, actorId, documentId, schemaVersion
TransportEnvelope: messageId, sourceReplicaId, targetReplicaId,
                   payloadBytes, enqueueSequence, deliveryState
```

Wall-clock labels are presentation metadata, not concurrency truth. Automerge change ancestry determines concurrency. Validate enum values and field limits at UI/import boundaries.

A conflict exists when the installed library exposes multiple concurrent values for a relevant task field. Display all surviving alternatives and available author/change metadata. Distinguish a deterministically rendered value from a user-resolved value.

A resolution is a new document change made after the resolver has observed all currently known conflicting alternatives. It does not erase history. If another unseen concurrent edit later arrives, show the resulting new conflict; do not declare resolution permanent.

### 4. Required technical spike

Before board styling, create two replicas from one common document history with distinct actor IDs. Edit owner concurrently to “Meera” and “Arjun,” exchange actual library messages/changes, and assert:

1. Both materialized replicas agree after synchronization reaches quiescence.
2. The owner conflict retains both alternatives through the supported conflict API.
3. A resolution written after observing both alternatives propagates to both replicas.
4. Saving and loading actual serialized state preserves the document and conflict semantics.

Document the exact dependency version and API calls in `docs/SYNC_CONTRACT.md`. If a chosen high-level wrapper hides conflicts, use the documented lower-level library rather than synthesizing conflict cards from UI state.

### 5. Transport and persistence

Keep one durable local replica state per replica. Persist document state and relevant metadata after changes, with a visible saving/saved/error state. Handle IndexedDB failure and schema migration explicitly. Export remains available when persistence fails.

Never persist incompatible library objects by naïve JSON serialization; use the library's supported byte representation. Maintain sync protocol state as documented. After a restart, safely establish a new sync session if persisted sync state is not supported.

The transport simulator uses a seeded schedule. Support disconnect, reconnect, deliver-next, duplicate-delivery, delayed-delivery, and drain-until-quiescent with a finite safety limit. A disconnected replica must not receive peer state through a shared global object or storage subscription.

Track actual encoded bytes and delivered message count. Render sync progress from pending messages and protocol outcomes, not a fixed timer.

“Converged” means equal normalized materialized task state after exchange quiesces. Compare conflict alternatives as well. A cryptographic hash can help identify a canonical snapshot but does not prove the algorithm correct or authenticate authors.

### 6. User experience

**Mandatory differentiating mechanism — acknowledgment validity:** A collaborative board and generic conflict inspector are insufficient. Add an explicit handoff acknowledgment containing task ID, owner, status, latest handoff-note ID, relevant known change heads, acknowledged-by identity, and the canonical content digest.

An acknowledgment means “this fictional coordinator saw this specified task state.” It is not a digital signature, authorization system, or proof of real-world task completion. Derive current validity by comparing the acknowledged relevant state with the current merged state and by checking unresolved relevant-field conflicts.

When an offline owner or status edit arrives, show whether it makes the prior acknowledgment stale and why. Unrelated edits to another task must not invalidate it. A relevant field changed and changed back may require re-acknowledgment if the contract tracks intervening relevant history; choose this stricter rule and record the relevant change ancestry. Content-hash equality alone is insufficient for that rule.

Demonstration: replica A acknowledges a handoff → disconnected B changes its owner → synchronize → replicas converge but acknowledgment becomes stale → inspect the exact causal change → resolve and acknowledge again. Keep no-op/irrelevant updates from generating false invalidation.

Implement the validity function against actual library history and include it in production tests, replay exports, milestone 3, and the final audit. This is the core product contribution; the board is its test surface.

**Operations board:** Two side-by-side replica panels, each independently editable. Connection controls sit on a visible bridge. Each panel has its own persistence and synchronization status.

**Conflict inbox:** Group by task and field. Show the competing values, known authors, causal context, and a clear resolve action with an optional reason. Never auto-resolve by hiding one card.

**History inspector:** A change/event timeline connects user actions, queued sync messages, delivery, conflict detection, and resolution. Inspect an actual transport receipt and a small diff.

**Replay scenarios:** Bundled demonstrations: disjoint edits merge; same-field concurrent edits conflict; duplicated delivery; disconnect/reload/reconnect; archive versus owner edit. Explain the policy for archived tasks with concurrent edits, without pretending physical deletion semantics are solved.

**Export and method:** Download a versioned replay bundle including serialized starting states, ordered user actions, transport schedule, and final observations. Import into an isolated namespace and replay. Exporting current state alone is not the replay bundle.

### 7. Visual direction

Use a field-operations desk: canvas `#F3F0EA`, dark ink `#202B31`, replica A cobalt `#2459A6`, replica B terracotta `#AE533B`. Put the board and message bridge first; minimize navigation chrome.

When reconnecting, animate actual delivered messages briefly. Keep animation optional and decoupled from state. Conflicts need text and icons, not just red highlighting. Use keyboard-operable cards and menus instead of drag-only controls. At 390px show a replica switcher plus persistent conflict count; desktop shows both.

Provide reduced motion, 200% zoom, readable history, empty states, storage quota errors, unsupported import errors, and a clear demo reset restricted to this project's storage.

### 8. Verification and benchmark

Tests must use the actual Automerge adapter and storage/transport modules. Cover disjoint edits, same-field concurrent edits, duplicate and reordered deliveries, fresh-session restart, delayed unseen edits after resolution, invalid import, task IDs, and isolated persistence namespaces.

Run a deterministic schedule suite across at least 20 seeds, two actors, and short operation sequences. Persist each operation log and delivery order. Assert convergence after quiescence; allow unresolved semantic conflicts and count them separately. A converged state is not necessarily a conflict-free business decision.

Run an adversarial negative control that deliberately drops a change and verify the convergence/evidence check detects the difference where expected. Do not report “100% reliable offline” from bounded tests.

Measure bytes exchanged, storage size, and time to quiescence for stated task/operation counts. Include browser and hardware. No million-user scalability claim.

Playwright: edit offline in both panels → reload → reconnect → reveal both owners → resolve → drain → export/import replay → match normalized final state. Verify keyboard and narrow-screen access.

### 9. Milestones and deliverables

1. Perform the actual-library spike; document schema and sync semantics.
2. Complete a functioning two-replica board with honest disconnected isolation.
3. Add persistence, conflict resolution, history, and replay exports.
4. Run schedule tests, inspect screenshots, and fix state/visual defects.
5. Prepare documentation and an evidence-based showcase.

Deliver working source, lockfile, valid dev/build/preview/test/test:e2e/benchmark commands, replay fixtures, README, sync contract, prior art, limitations, validation, performance, five screenshots, demo script, interview notes, and a LinkedIn draft.

60-second demonstration: disconnect → two different owners → reload → reconnect → visible conflict → deliberate resolution → matching replicas.

Interview notes: convergence versus agreement, causal order versus clock order, why immutable identity matters, persistence failure, and why a real multi-device deployment needs additional transport and security work.

### 10. Prior art

Read [Automerge's tutorial](https://automerge.org/docs/tutorial/), [its conflict documentation](https://automerge.org/docs/reference/documents/conflicts/), and [Yjs documentation](https://docs.yjs.dev/).

Local-first collaboration and CRDTs are established. The contribution is an explicit handoff-conflict workflow coupled to a reproducible transport replay. Do not claim to invent synchronization or that library convergence automatically resolves conflicting human intentions.

Begin with the library spike now. Completion requires actual persisted replicas, actual synchronization, visible concurrent alternatives, and replay verification.

### Continuation prompt

Read PROJECT_SPEC.md, BUILD_STATUS.md, and the pinned sync adapter. Resume the first incomplete milestone. Preserve independently persisted replicas and the real library conflict API. Do not substitute shared React state or a scripted conflict animation for synchronization.

### Final audit prompt

Disconnect both replicas, make concurrent changes, reload, and reconnect through the actual transport. Verify conflict alternatives, resolution ancestry, fresh-session recovery, and replay exports. Check that “converged” is based on state equality rather than a timer. Report bounded-test limitations honestly.

# LinkedIn Post Draft: RELAY

---

In most collaborative apps (Trello, Jira, Notion), if two people lose internet connection and edit the same task, the app uses Last-Writer-Wins (LWW) to resolve it.

Whoever happened to reconnect 1 millisecond later completely wipes out the other person’s work. 📉

Even worse: if you handed off a task to someone, and someone else reassigns it while offline, the handoff status still looks "valid"—until two people show up at the same venue to do the exact same job.

To solve this, I built **RELAY**: an offline-first handoff laboratory built on **Automerge v3.5 CRDTs** with **Causal Acknowledgment Validity**.

Here is what happens under the hood:

### 1. Two Independent Replicas in One Browser
RELAY models a field-operations desk with two coordinators: Meera (in Cobalt) and Arjun (in Terracotta).
- Each has their own isolated Automerge document, actor identity, and local IndexedDB namespace.
- Between them sits a **Visible Transport Bridge** that lets you pause connectivity, inspect pending binary envelopes, and inject network packet duplicates or reordering.

### 2. Convergence ≠ Agreement
When Meera and Arjun both assign Task T1 to themselves while offline and reconnect:
- Automerge converges mathematically: both replicas compute the exact same binary document heads.
- But RELAY **does not pretend their disagreement disappeared**.
- The Multi-Value Register preserves both competing alternatives in Automerge’s history and surfaces them in the **Conflict Inbox** with raw change Op IDs.

### 3. Causal Handoff Acknowledgment Validity
The central mechanism: an acknowledgment is not a static checkbox; it is bound to the exact causal state a coordinator saw.
- If Meera acknowledged T1 as "Meera · in-progress", and Arjun’s offline change arrives, the acknowledgment immediately flips to **Stale**.
- Even if a field was changed and changed back, strict causal ancestry detection marks the acknowledgment stale because intervening unreviewed history occurred.
- Unrelated edits to other tasks do NOT trigger false invalidations.

### 4. Technical Spike & Empirical Benchmarks
- Verified against 25 deterministic schedule seeds: 100% quiescent convergence in $\le 4$ rounds, exchanging ~840 bytes per session.
- Adversarial negative control: deliberately dropping sync packets correctly proves divergence based on cryptographic heads rather than a timer.
- Zero cloud servers, running entirely client-side via Automerge Rust/WASM in Vite.

Live Demo & Code: [Link in comments]

How does your team handle offline conflict resolution in mobile or field operations? LWW timestamps or multi-value CRDT registers?

#DistributedSystems #CRDT #LocalFirst #Automerge #SoftwareEngineering #TypeScript #WebAssembly #SystemDesign

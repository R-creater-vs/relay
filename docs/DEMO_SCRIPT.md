# RELAY Demo Script: 60-Second Executive Walkthrough

**Target Audience:** Principal Systems Architect / Head of Collaboration Engineering / Distributed Systems Lead  
**Core Thesis:** *“When two people edit a shared task while disconnected, naive apps use Last-Writer-Wins to silently wipe out one person's work. RELAY lets both continue working, converges deterministically via Automerge CRDTs, reveals the conflict in context, and automatically invalidates prior handoff acknowledgments.”*

---

## Act I: The Festival Scenario (0:00 - 0:15)
*Open browser to Operations Desk. Bridge is offline.*

> "Imagine two event coordinators, Meera on the left in Cobalt and Arjun on the right in Terracotta.  
> They lose cell reception in the middle of a festival.  
> Notice our Transport Bridge in the center is disconnected.  
> Meera sees the Sound System Setup task (T1) and assigns it to herself.  
> Arjun on his phone sees the exact same task unassigned and assigns it to himself.  
> Both continue working locally without blocking modal errors."

---

## Act II: Reconnection & Non-Destructive Convergence (0:15 - 0:30)
*Click 'Drain to Quiescence' on the Transport Bridge.*

> "Now connectivity returns. We click **Drain to Quiescence**.  
> Watch the sync messages flow across the wire: 4 messages, 840 bytes.  
> Notice what happened: both replicas reach identical document heads.  
> But the system did **not** pretend Arjun's edit never happened!  
> Look at the red banner on Task T1: **Concurrent Conflict Detected**.  
> Automerge preserved both competing values in its multi-value register."

---

## Act III: The Stale Acknowledgment Trap (0:30 - 0:45)
*Hover over the Acknowledgment Banner on Task T1.*

> "Look at the Handoff Acknowledgment banner below:  
> Prior to syncing, Meera had acknowledged this task.  
> Now it displays: **⚠️ Acknowledgment Became Stale: Task state has changed since acknowledgment was signed.**  
> Unlike static to-do lists, RELAY ties acknowledgments to the exact causal state a coordinator saw. When an unseen relevant change arrives, the acknowledgment is revoked automatically."

---

## Act IV: Conflict Inbox & Explicit Resolution (0:45 - 1:00)
*Switch to **Conflict Inbox**, choose negotiated compromise 'Meera & Arjun', click **Commit Resolution**.*

> "Switching to the **Conflict Inbox**, both competing alternatives are visible side-by-side with their raw change IDs.  
> The coordinators decide to co-lead the sound system.  
> We type *'Meera & Arjun'*, record our reason, and commit.  
> The resolution propagates across the bridge, eliminates the conflict, and Meera signs a fresh handoff acknowledgment.  
> Pure local-first Automerge CRDT collaboration with zero silent data loss."

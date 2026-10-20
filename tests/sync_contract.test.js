import test from 'node:test';
import assert from 'node:assert/strict';
import * as Automerge from '@automerge/automerge';
import {
  createInitialDoc,
  loadDocFromBytes,
  addTaskToDoc,
  updateTaskFieldInDoc,
  recordAcknowledgmentInDoc,
  resolveConflictInDoc,
  getTaskConflicts,
  checkAcknowledgmentValidity,
  ACTOR_MEERA,
  ACTOR_ARJUN,
} from '../src/domain/crdt.ts';
import { TransportSimulator } from '../src/transport/simulator.ts';

test('Contract 1: Disjoint Offline Edits Merge Cleanly Without Conflicts', () => {
  // Common base document with two tasks
  let base = createInitialDoc('00000000000000000000000000000001');
  base = addTaskToDoc(base, {
    taskId: 'T1',
    title: 'Sound System Setup',
    ownerId: 'Unassigned',
    status: 'todo',
    archived: false,
  });
  base = addTaskToDoc(base, {
    taskId: 'T2',
    title: 'Stage Lighting',
    ownerId: 'Unassigned',
    status: 'todo',
    archived: false,
  });

  const baseBytes = Automerge.save(base);
  let docA = loadDocFromBytes(baseBytes, ACTOR_MEERA);
  let docB = loadDocFromBytes(baseBytes, ACTOR_ARJUN);

  // Disjoint edits while offline:
  // Meera claims T1 on Replica A
  docA = updateTaskFieldInDoc(docA, 'T1', 'ownerId', 'Meera');
  // Arjun claims T2 on Replica B
  docB = updateTaskFieldInDoc(docB, 'T2', 'ownerId', 'Arjun');

  // Synchronize through transport simulator
  const transport = new TransportSimulator(true);
  const syncA = Automerge.initSyncState();
  const syncB = Automerge.initSyncState();

  const syncResult = transport.drainSyncSession(docA, syncA, docB, syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;

  // Assert convergence
  assert.equal(docA.tasks.T1.ownerId, 'Meera');
  assert.equal(docB.tasks.T1.ownerId, 'Meera');
  assert.equal(docA.tasks.T2.ownerId, 'Arjun');
  assert.equal(docB.tasks.T2.ownerId, 'Arjun');
  assert.deepEqual(Automerge.getHeads(docA), Automerge.getHeads(docB));

  // Assert zero conflicts
  assert.equal(getTaskConflicts(docA, 'T1'), null);
  assert.equal(getTaskConflicts(docA, 'T2'), null);
});

test('Contract 2: Concurrent Same-Field Edits Produce Visible Automerge Conflicts', () => {
  let base = createInitialDoc('00000000000000000000000000000001');
  base = addTaskToDoc(base, {
    taskId: 'T1',
    title: 'Security Staffing',
    ownerId: 'Coordinator',
    status: 'todo',
    archived: false,
  });

  const baseBytes = Automerge.save(base);
  let docA = loadDocFromBytes(baseBytes, ACTOR_MEERA);
  let docB = loadDocFromBytes(baseBytes, ACTOR_ARJUN);

  // Concurrent offline conflicting edits to ownerId
  docA = updateTaskFieldInDoc(docA, 'T1', 'ownerId', 'Meera');
  docB = updateTaskFieldInDoc(docB, 'T1', 'ownerId', 'Arjun');

  const transport = new TransportSimulator(true);
  const syncA = Automerge.initSyncState();
  const syncB = Automerge.initSyncState();

  const syncResult = transport.drainSyncSession(docA, syncA, docB, syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;

  // Both replicas must converge to the identical deterministic value
  assert.equal(docA.tasks.T1.ownerId, docB.tasks.T1.ownerId);

  // Conflict must be retained and exposed via getTaskConflicts
  const conflictsA = getTaskConflicts(docA, 'T1');
  const conflictsB = getTaskConflicts(docB, 'T1');

  assert.ok(conflictsA !== null, 'Conflicts must be detected on Replica A');
  assert.ok(conflictsB !== null, 'Conflicts must be detected on Replica B');
  assert.equal(conflictsA.conflicts.length, 1);
  assert.equal(conflictsA.conflicts[0].field, 'ownerId');

  const values = conflictsA.conflicts[0].competingValues.map((c) => c.value);
  assert.ok(values.includes('Meera'), 'Competing values must include Meera');
  assert.ok(values.includes('Arjun'), 'Competing values must include Arjun');
});

test('Contract 3: Causal Handoff Acknowledgment Invalidation', () => {
  let base = createInitialDoc('00000000000000000000000000000001');
  base = addTaskToDoc(base, {
    taskId: 'T1',
    title: 'VIP Lounge Setup',
    ownerId: 'Meera',
    status: 'in-progress',
    archived: false,
  });
  base = addTaskToDoc(base, {
    taskId: 'T2',
    title: 'Food Truck Permits',
    ownerId: 'Arjun',
    status: 'todo',
    archived: false,
  });

  const baseBytes = Automerge.save(base);
  let docA = loadDocFromBytes(baseBytes, ACTOR_MEERA);
  let docB = loadDocFromBytes(baseBytes, ACTOR_ARJUN);

  // Meera signs handoff acknowledgment on Replica A for T1
  const { doc: docA_Acked, ackId } = recordAcknowledgmentInDoc(docA, 'T1', 'Meera (Replica A)');
  docA = docA_Acked;
  const ack = docA.acknowledgments[ackId];

  // Immediately after signing, acknowledgment is VALID
  const initialValidity = checkAcknowledgmentValidity(docA, ack);
  assert.equal(initialValidity.isValid, true);
  assert.equal(initialValidity.reason, 'valid');

  // Case 3A: Disconnected Arjun changes UNRELATED task T2 on Replica B
  docB = updateTaskFieldInDoc(docB, 'T2', 'status', 'in-progress');

  // Synchronize
  const transport = new TransportSimulator(true);
  const syncA = Automerge.initSyncState();
  const syncB = Automerge.initSyncState();
  let syncResult = transport.drainSyncSession(docA, syncA, docB, syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;

  // Unrelated edit to T2 does NOT invalidate T1 acknowledgment!
  const validityAfterT2 = checkAcknowledgmentValidity(docA, ack);
  assert.equal(validityAfterT2.isValid, true, 'Unrelated edit must not invalidate T1 acknowledgment');

  // Case 3B: Disconnected Arjun reassigns RELEVANT task T1 owner to "Arjun"
  docB = updateTaskFieldInDoc(docB, 'T1', 'ownerId', 'Arjun');

  // Synchronize
  syncResult = transport.drainSyncSession(docA, syncResult.syncA, docB, syncResult.syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;

  // Now, T1 acknowledgment MUST become STALE!
  const validityAfterT1 = checkAcknowledgmentValidity(docA, ack);
  assert.equal(validityAfterT1.isValid, false, 'Relevant edit must invalidate acknowledgment');
  assert.ok(
    validityAfterT1.reason === 'content_mismatch' || validityAfterT1.reason === 'unresolved_conflicts',
    `Reason must indicate mismatch or conflict: ${validityAfterT1.reason}`
  );
});

test('Contract 4: Explicit Resolution Resolves Conflict & Propagates', () => {
  let base = createInitialDoc('00000000000000000000000000000001');
  base = addTaskToDoc(base, {
    taskId: 'T1',
    title: 'DJ Equipment',
    ownerId: 'Coordinator',
    status: 'todo',
    archived: false,
  });

  const baseBytes = Automerge.save(base);
  let docA = loadDocFromBytes(baseBytes, ACTOR_MEERA);
  let docB = loadDocFromBytes(baseBytes, ACTOR_ARJUN);

  // Concurrent conflicting edits
  docA = updateTaskFieldInDoc(docA, 'T1', 'ownerId', 'Meera');
  docB = updateTaskFieldInDoc(docB, 'T1', 'ownerId', 'Arjun');

  const transport = new TransportSimulator(true);
  let syncA = Automerge.initSyncState();
  let syncB = Automerge.initSyncState();
  let syncResult = transport.drainSyncSession(docA, syncA, docB, syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;

  // Conflict exists
  assert.ok(getTaskConflicts(docA, 'T1') !== null);

  // Meera explicitly resolves conflict to negotiated compromise: "Meera & Arjun"
  docA = resolveConflictInDoc(
    docA,
    'T1',
    'ownerId',
    'Meera & Arjun',
    'Meera (Replica A)',
    'Agreed to co-lead sound and stage management'
  );

  // Sync resolution to Replica B
  syncResult = transport.drainSyncSession(docA, syncResult.syncA, docB, syncResult.syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;

  // Replicas match and conflict is eliminated
  assert.equal(docA.tasks.T1.ownerId, 'Meera & Arjun');
  assert.equal(docB.tasks.T1.ownerId, 'Meera & Arjun');
  assert.equal(getTaskConflicts(docA, 'T1'), null, 'Conflict must be eliminated after resolution');
  assert.equal(getTaskConflicts(docB, 'T1'), null, 'Conflict must be eliminated on peer replica');
  assert.equal(Object.keys(docA.resolutions).length, 1);
});

test('Contract 5: Transport Robustness (Duplicate Delivery & Adversarial Dropping)', () => {
  let base = createInitialDoc('00000000000000000000000000000001');
  base = addTaskToDoc(base, {
    taskId: 'T1',
    title: 'Medical Tent',
    ownerId: 'Dr. Rao',
    status: 'todo',
    archived: false,
  });

  const baseBytes = Automerge.save(base);
  let docA = loadDocFromBytes(baseBytes, ACTOR_MEERA);
  let docB = loadDocFromBytes(baseBytes, ACTOR_ARJUN);

  // Meera updates title on Replica A
  docA = updateTaskFieldInDoc(docA, 'T1', 'title', 'Emergency Medical Tent');

  const transport = new TransportSimulator(true);
  let syncA = Automerge.initSyncState();
  let syncB = Automerge.initSyncState();

  // Step 1: Normal sync exchange until quiescence
  const syncResult = transport.drainSyncSession(docA, syncA, docB, syncB);
  docA = syncResult.docA;
  docB = syncResult.docB;
  syncA = syncResult.syncA;
  syncB = syncResult.syncB;

  assert.equal(docB.tasks.T1.title, 'Emergency Medical Tent');

  // Step 2: Adversarial duplicate message delivery (replaying a sync message)
  const [, dupMsg] = Automerge.generateSyncMessage(docA, syncA);
  if (dupMsg) {
    const [docB2, nextSyncB2] = Automerge.receiveSyncMessage(docB, syncB, dupMsg);
    docB = docB2;
    syncB = nextSyncB2;
  }

  // Document remains completely valid and consistent (idempotent sync protocol)
  assert.equal(docB.tasks.T1.title, 'Emergency Medical Tent');
  assert.equal(docB.tasks.T1.ownerId, 'Dr. Rao');
  assert.deepEqual(Automerge.getHeads(docA), Automerge.getHeads(docB));
});

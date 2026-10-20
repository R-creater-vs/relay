import * as Automerge from '@automerge/automerge';
import assert from 'node:assert/strict';

console.log('Testing Automerge version and API...');

// 1. Initial shared document
let baseDoc = Automerge.init({ actor: '00000000000000000000000000000001' });
baseDoc = Automerge.change(baseDoc, 'Init task T1', (d) => {
  d.tasks = {
    T1: {
      taskId: 'T1',
      title: 'Sound System Setup',
      ownerId: 'Coordinator',
      status: 'todo',
      archived: false,
      notesById: {},
    },
  };
});

// Save shared state to binary
const baseBytes = Automerge.save(baseDoc);

// 2. Clone into Replica A (Meera) and Replica B (Arjun) with distinct valid 32-hex actor IDs
const ACTOR_A = '11111111111111111111111111111111';
const ACTOR_B = '22222222222222222222222222222222';

let docA = Automerge.load(baseBytes, { actor: ACTOR_A });
let docB = Automerge.load(baseBytes, { actor: ACTOR_B });

// 3. Concurrent edits while disconnected
docA = Automerge.change(docA, 'Meera takes ownership', (d) => {
  d.tasks.T1.ownerId = 'Meera';
});

docB = Automerge.change(docB, 'Arjun takes ownership', (d) => {
  d.tasks.T1.ownerId = 'Arjun';
});

assert.equal(docA.tasks.T1.ownerId, 'Meera');
assert.equal(docB.tasks.T1.ownerId, 'Arjun');

// 4. Synchronization loop using actual sync protocol
let syncStateA = Automerge.initSyncState();
let syncStateB = Automerge.initSyncState();

let round = 0;
while (round < 10) {
  round++;
  const [nextSyncA, msgAtoB] = Automerge.generateSyncMessage(docA, syncStateA);
  syncStateA = nextSyncA;

  const [nextSyncB, msgBtoA] = Automerge.generateSyncMessage(docB, syncStateB);
  syncStateB = nextSyncB;

  if (!msgAtoB && !msgBtoA) {
    break; // Quiescence reached
  }

  if (msgAtoB) {
    const [nextDocB, nextSyncStateB] = Automerge.receiveSyncMessage(docB, syncStateB, msgAtoB);
    docB = nextDocB;
    syncStateB = nextSyncStateB;
  }

  if (msgBtoA) {
    const [nextDocA, nextSyncStateA] = Automerge.receiveSyncMessage(docA, syncStateA, msgBtoA);
    docA = nextDocA;
    syncStateA = nextSyncStateA;
  }
}

console.log(`Sync quiesced in ${round} iterations.`);

// Assert 1: Both materialized replicas agree after quiescence
assert.equal(docA.tasks.T1.ownerId, docB.tasks.T1.ownerId, 'Materialized ownerId must match');
const chosenWinner = docA.tasks.T1.ownerId;
console.log(`Deterministic winning ownerId: ${chosenWinner}`);

// Assert 2: The owner conflict retains both alternatives through getConflicts
const conflictsA = Automerge.getConflicts(docA.tasks.T1, 'ownerId');
const conflictsB = Automerge.getConflicts(docB.tasks.T1, 'ownerId');
console.log('Conflicts A:', conflictsA);
console.log('Conflicts B:', conflictsB);

assert.ok(conflictsA, 'Conflicts on ownerId must exist in docA');
assert.ok(conflictsB, 'Conflicts on ownerId must exist in docB');
const valuesA = Object.values(conflictsA);
assert.ok(valuesA.includes('Meera'), 'Conflicts must include Meera');
assert.ok(valuesA.includes('Arjun'), 'Conflicts must include Arjun');
assert.equal(valuesA.length, 2, 'Should have exactly 2 conflicting alternatives');

// Assert 3: A resolution written after observing both alternatives propagates to both replicas
docA = Automerge.change(docA, 'Resolve conflict to Joint Ownership: Meera & Arjun', (d) => {
  d.tasks.T1.ownerId = 'Meera & Arjun';
});

// Sync again
while (true) {
  const [nextSyncA, msgAtoB] = Automerge.generateSyncMessage(docA, syncStateA);
  syncStateA = nextSyncA;
  const [nextSyncB, msgBtoA] = Automerge.generateSyncMessage(docB, syncStateB);
  syncStateB = nextSyncB;
  if (!msgAtoB && !msgBtoA) break;

  if (msgAtoB) {
    const [nextDocB, nextSyncStateB] = Automerge.receiveSyncMessage(docB, syncStateB, msgAtoB);
    docB = nextDocB;
    syncStateB = nextSyncStateB;
  }
  if (msgBtoA) {
    const [nextDocA, nextSyncStateA] = Automerge.receiveSyncMessage(docA, syncStateA, msgBtoA);
    docA = nextDocA;
    syncStateA = nextSyncStateA;
  }
}

assert.equal(docA.tasks.T1.ownerId, 'Meera & Arjun');
assert.equal(docB.tasks.T1.ownerId, 'Meera & Arjun');
const resolvedConflicts = Automerge.getConflicts(docA.tasks.T1, 'ownerId');
console.log('Resolved conflicts A:', resolvedConflicts);
// After resolution, conflicts map should be undefined or empty
assert.ok(!resolvedConflicts || Object.keys(resolvedConflicts).length <= 1, 'Conflict must be resolved');

// Assert 4: Saving and loading actual serialized state preserves document
const savedA = Automerge.save(docA);
const reloadedA = Automerge.load(savedA);
assert.equal(reloadedA.tasks.T1.ownerId, 'Meera & Arjun');
assert.deepEqual(Automerge.getHeads(reloadedA), Automerge.getHeads(docA));

console.log('🎉 Spike completed and all 4 assertions verified!');

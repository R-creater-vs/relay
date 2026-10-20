import React, { useState, useEffect, useRef } from 'react';
import * as Automerge from '@automerge/automerge';
import { HeaderRail } from '../components/HeaderRail';
import { ReplicaPanel } from '../features/board/ReplicaPanel';
import { TransportBridge } from '../features/board/TransportBridge';
import { ConflictInboxView } from '../features/conflicts/ConflictInboxView';
import { HistoryInspectorView } from '../features/history/HistoryInspectorView';
import { GuidedScenariosView } from '../features/scenarios/GuidedScenariosView';
import { ExportAndMethodView } from '../features/export/ExportAndMethodView';
import {
  createInitialDoc,
  loadDocFromBytes,
  addTaskToDoc,
  updateTaskFieldInDoc,
  addNoteToDoc,
  recordAcknowledgmentInDoc,
  resolveConflictInDoc,
  getAllDocConflicts,
  ACTOR_MEERA,
  ACTOR_ARJUN,
} from '../domain/crdt';
import { TransportSimulator } from '../transport/simulator';
import { RelayDoc, TaskStatus, TransportEnvelope } from '../domain/types';
import { saveReplicaDoc, clearReplicaStorage } from '../storage/indexeddb';

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('board');
  const [mobileActiveReplica, setMobileActiveReplica] = useState<'A' | 'B'>('A');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Core CRDT State: Two distinct Automerge documents
  const [docA, setDocA] = useState<Automerge.Doc<RelayDoc>>(() => {
    let doc = createInitialDoc(ACTOR_MEERA);
    doc = addTaskToDoc(doc, {
      taskId: 'T1',
      title: 'Sound System Setup',
      ownerId: 'Meera',
      status: 'in-progress',
      archived: false,
    });
    doc = addTaskToDoc(doc, {
      taskId: 'T2',
      title: 'VIP Lounge Catering',
      ownerId: 'Arjun',
      status: 'todo',
      archived: false,
    });
    return doc;
  });

  const [docB, setDocB] = useState<Automerge.Doc<RelayDoc>>(() => {
    let doc = createInitialDoc(ACTOR_ARJUN);
    doc = addTaskToDoc(doc, {
      taskId: 'T1',
      title: 'Sound System Setup',
      ownerId: 'Meera',
      status: 'in-progress',
      archived: false,
    });
    doc = addTaskToDoc(doc, {
      taskId: 'T2',
      title: 'VIP Lounge Catering',
      ownerId: 'Arjun',
      status: 'todo',
      archived: false,
    });
    return doc;
  });

  // Sync states
  const syncStateARef = useRef<Automerge.SyncState>(Automerge.initSyncState());
  const syncStateBRef = useRef<Automerge.SyncState>(Automerge.initSyncState());

  // Transport Simulator
  const transportRef = useRef<TransportSimulator>(new TransportSimulator(false));
  const [transportMetrics, setTransportMetrics] = useState(transportRef.current.getMetrics());
  const [queues, setQueues] = useState(transportRef.current.getQueues());
  const [isSyncing, setIsSyncing] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Event log for history inspector
  const [eventLog, setEventLog] = useState<
    Array<{
      id: string;
      timestamp: number;
      actor: string;
      type: 'edit' | 'sync' | 'conflict' | 'resolution' | 'acknowledgment';
      description: string;
      envelope?: TransportEnvelope;
    }>
  >([
    {
      id: 'init-1',
      timestamp: Date.now() - 60000,
      actor: 'System',
      type: 'sync',
      description: 'Initialized shared festival task board schema with tasks T1 & T2',
    },
  ]);

  // Persist documents
  useEffect(() => {
    setPersistenceStatus('saving');
    Promise.all([
      saveReplicaDoc('relay-replica-a', Automerge.save(docA)),
      saveReplicaDoc('relay-replica-b', Automerge.save(docB)),
    ])
      .then(() => setPersistenceStatus('saved'))
      .catch(() => setPersistenceStatus('error'));
  }, [docA, docB]);

  // Generate sync envelopes whenever docA or docB change
  const queueSyncMessage = (from: 'A' | 'B') => {
    if (from === 'A') {
      const [nextSyncA, msg] = Automerge.generateSyncMessage(docA, syncStateARef.current);
      syncStateARef.current = nextSyncA;
      if (msg) {
        const env = transportRef.current.enqueueMessage('A', msg);
        setQueues(transportRef.current.getQueues());
        setTransportMetrics(transportRef.current.getMetrics());
        setEventLog((prev) => [
          {
            id: env.messageId,
            timestamp: Date.now(),
            actor: 'Meera (Replica A)',
            type: 'sync',
            description: `Queued sync packet for Arjun (${msg.byteLength} bytes)`,
            envelope: env,
          },
          ...prev,
        ]);

        // If bridge is live, deliver immediately
        if (transportRef.current.isBridgeConnected) {
          deliverNextPacket('AtoB');
        }
      }
    } else {
      const [nextSyncB, msg] = Automerge.generateSyncMessage(docB, syncStateBRef.current);
      syncStateBRef.current = nextSyncB;
      if (msg) {
        const env = transportRef.current.enqueueMessage('B', msg);
        setQueues(transportRef.current.getQueues());
        setTransportMetrics(transportRef.current.getMetrics());
        setEventLog((prev) => [
          {
            id: env.messageId,
            timestamp: Date.now(),
            actor: 'Arjun (Replica B)',
            type: 'sync',
            description: `Queued sync packet for Meera (${msg.byteLength} bytes)`,
            envelope: env,
          },
          ...prev,
        ]);

        if (transportRef.current.isBridgeConnected) {
          deliverNextPacket('BtoA');
        }
      }
    }
  };

  // Deliver single packet
  const deliverNextPacket = (direction: 'AtoB' | 'BtoA') => {
    const envelope = transportRef.current.deliverNext(direction);
    setQueues(transportRef.current.getQueues());
    setTransportMetrics(transportRef.current.getMetrics());

    if (!envelope) return;

    if (direction === 'AtoB') {
      const [nextDocB, nextSyncB] = Automerge.receiveSyncMessage(
        docB,
        syncStateBRef.current,
        envelope.payloadBytes
      );
      setDocB(nextDocB);
      syncStateBRef.current = nextSyncB;

      // Check if B now needs to reply to A
      const [replySyncB, replyMsg] = Automerge.generateSyncMessage(nextDocB, nextSyncB);
      syncStateBRef.current = replySyncB;
      if (replyMsg) {
        transportRef.current.enqueueMessage('B', replyMsg);
        setQueues(transportRef.current.getQueues());
        setTransportMetrics(transportRef.current.getMetrics());
      }
    } else {
      const [nextDocA, nextSyncA] = Automerge.receiveSyncMessage(
        docA,
        syncStateARef.current,
        envelope.payloadBytes
      );
      setDocA(nextDocA);
      syncStateARef.current = nextSyncA;

      const [replySyncA, replyMsg] = Automerge.generateSyncMessage(nextDocA, nextSyncA);
      syncStateARef.current = replySyncA;
      if (replyMsg) {
        transportRef.current.enqueueMessage('A', replyMsg);
        setQueues(transportRef.current.getQueues());
        setTransportMetrics(transportRef.current.getMetrics());
      }
    }
  };

  // Full Quiescence Drain
  const handleDrainQuiescence = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const result = transportRef.current.drainSyncSession(
        docA,
        syncStateARef.current,
        docB,
        syncStateBRef.current
      );
      setDocA(result.docA);
      setDocB(result.docB);
      syncStateARef.current = result.syncA;
      syncStateBRef.current = result.syncB;
      transportRef.current.clearQueues();

      setQueues(transportRef.current.getQueues());
      setTransportMetrics(transportRef.current.getMetrics());
      setIsSyncing(false);

      setEventLog((prev) => [
        {
          id: `drain-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Transport Bridge',
          type: 'sync',
          description: `Quiescence reached in ${result.rounds} rounds (${result.messagesExchanged} messages, ${result.bytesExchanged} bytes)`,
        },
        ...prev,
      ]);
    }, 150);
  };

  // Field Edit Handlers
  const handleUpdateOwner = (replica: 'A' | 'B', taskId: string, newOwner: string) => {
    if (replica === 'A') {
      const nextDoc = updateTaskFieldInDoc(docA, taskId, 'ownerId', newOwner);
      setDocA(nextDoc);
      setEventLog((prev) => [
        {
          id: `edit-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Meera (Replica A)',
          type: 'edit',
          description: `Changed ${taskId} owner to "${newOwner}"`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('A'), 20);
    } else {
      const nextDoc = updateTaskFieldInDoc(docB, taskId, 'ownerId', newOwner);
      setDocB(nextDoc);
      setEventLog((prev) => [
        {
          id: `edit-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Arjun (Replica B)',
          type: 'edit',
          description: `Changed ${taskId} owner to "${newOwner}"`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('B'), 20);
    }
  };

  const handleUpdateStatus = (replica: 'A' | 'B', taskId: string, newStatus: TaskStatus) => {
    if (replica === 'A') {
      const nextDoc = updateTaskFieldInDoc(docA, taskId, 'status', newStatus);
      setDocA(nextDoc);
      setEventLog((prev) => [
        {
          id: `edit-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Meera (Replica A)',
          type: 'edit',
          description: `Changed ${taskId} status to "${newStatus}"`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('A'), 20);
    } else {
      const nextDoc = updateTaskFieldInDoc(docB, taskId, 'status', newStatus);
      setDocB(nextDoc);
      setEventLog((prev) => [
        {
          id: `edit-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Arjun (Replica B)',
          type: 'edit',
          description: `Changed ${taskId} status to "${newStatus}"`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('B'), 20);
    }
  };

  const handleAddNote = (replica: 'A' | 'B', taskId: string, text: string) => {
    const author = replica === 'A' ? 'Meera' : 'Arjun';
    if (replica === 'A') {
      const nextDoc = addNoteToDoc(docA, taskId, author, text);
      setDocA(nextDoc);
      setEventLog((prev) => [
        {
          id: `note-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Meera (Replica A)',
          type: 'edit',
          description: `Added note to ${taskId}: "${text}"`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('A'), 20);
    } else {
      const nextDoc = addNoteToDoc(docB, taskId, author, text);
      setDocB(nextDoc);
      setEventLog((prev) => [
        {
          id: `note-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Arjun (Replica B)',
          type: 'edit',
          description: `Added note to ${taskId}: "${text}"`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('B'), 20);
    }
  };

  const handleAcknowledgeHandoff = (replica: 'A' | 'B', taskId: string) => {
    const author = replica === 'A' ? 'Meera (Replica A)' : 'Arjun (Replica B)';
    if (replica === 'A') {
      const { doc: nextDoc } = recordAcknowledgmentInDoc(docA, taskId, author);
      setDocA(nextDoc);
      setEventLog((prev) => [
        {
          id: `ack-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Meera (Replica A)',
          type: 'acknowledgment',
          description: `Signed handoff acknowledgment for ${taskId}`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('A'), 20);
    } else {
      const { doc: nextDoc } = recordAcknowledgmentInDoc(docB, taskId, author);
      setDocB(nextDoc);
      setEventLog((prev) => [
        {
          id: `ack-${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Arjun (Replica B)',
          type: 'acknowledgment',
          description: `Signed handoff acknowledgment for ${taskId}`,
        },
        ...prev,
      ]);
      setTimeout(() => queueSyncMessage('B'), 20);
    }
  };

  // Explicit Conflict Resolution Handler
  const handleResolveConflict = (
    taskId: string,
    field: 'ownerId' | 'status' | 'title',
    selectedValue: string,
    reason: string
  ) => {
    // Resolve on Replica A
    const nextDocA = resolveConflictInDoc(
      docA,
      taskId,
      field,
      selectedValue,
      'Meera (Replica A)',
      reason
    );
    setDocA(nextDocA);

    setEventLog((prev) => [
      {
        id: `res-${Date.now()}`,
        timestamp: Date.now(),
        actor: 'Coordinator Resolution',
        type: 'resolution',
        description: `Resolved ${taskId}.${field} to "${selectedValue}" (${reason})`,
      },
      ...prev,
    ]);

    // Automatically sync resolution to B
    setTimeout(() => {
      handleDrainQuiescence();
    }, 50);
  };

  // Guided Scenarios Preset Loader
  const handleLoadScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);

    // Common base document
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
      title: 'VIP Lounge Catering',
      ownerId: 'Unassigned',
      status: 'todo',
      archived: false,
    });

    const baseBytes = Automerge.save(base);
    let nextA = loadDocFromBytes(baseBytes, ACTOR_MEERA);
    let nextB = loadDocFromBytes(baseBytes, ACTOR_ARJUN);
    syncStateARef.current = Automerge.initSyncState();
    syncStateBRef.current = Automerge.initSyncState();
    transportRef.current.clearQueues();
    transportRef.current.isBridgeConnected = false;

    if (scenarioId === 'sc-01-campus-conflict') {
      // Meera sets T1 to Meera; Arjun sets T1 to Arjun offline
      nextA = updateTaskFieldInDoc(nextA, 'T1', 'ownerId', 'Meera');
      nextB = updateTaskFieldInDoc(nextB, 'T1', 'ownerId', 'Arjun');

      // Sync and reveal conflict
      const result = transportRef.current.drainSyncSession(
        nextA,
        syncStateARef.current,
        nextB,
        syncStateBRef.current
      );
      nextA = result.docA;
      nextB = result.docB;
      syncStateARef.current = result.syncA;
      syncStateBRef.current = result.syncB;
    } else if (scenarioId === 'sc-02-disjoint-merge') {
      // Meera marks T1 in-progress, Arjun claims T2
      nextA = updateTaskFieldInDoc(nextA, 'T1', 'status', 'in-progress');
      nextB = updateTaskFieldInDoc(nextB, 'T2', 'ownerId', 'Arjun');
      const result = transportRef.current.drainSyncSession(
        nextA,
        syncStateARef.current,
        nextB,
        syncStateBRef.current
      );
      nextA = result.docA;
      nextB = result.docB;
      syncStateARef.current = result.syncA;
      syncStateBRef.current = result.syncB;
    } else if (scenarioId === 'sc-04-change-back-stale') {
      // Meera acknowledges T1
      const { doc: ackedA } = recordAcknowledgmentInDoc(nextA, 'T1', 'Meera (Replica A)');
      nextA = ackedA;
      // Sync acknowledgment to B
      const sync1 = transportRef.current.drainSyncSession(
        nextA,
        syncStateARef.current,
        nextB,
        syncStateBRef.current
      );
      nextA = sync1.docA;
      nextB = sync1.docB;
      syncStateARef.current = sync1.syncA;
      syncStateBRef.current = sync1.syncB;

      // Arjun modifies T1 to blocked and then changes back to todo
      nextB = updateTaskFieldInDoc(nextB, 'T1', 'status', 'blocked');
      nextB = updateTaskFieldInDoc(nextB, 'T1', 'status', 'todo');

      const sync2 = transportRef.current.drainSyncSession(
        nextA,
        syncStateARef.current,
        nextB,
        syncStateBRef.current
      );
      nextA = sync2.docA;
      nextB = sync2.docB;
      syncStateARef.current = sync2.syncA;
      syncStateBRef.current = sync2.syncB;
    }

    setDocA(nextA);
    setDocB(nextB);
    setQueues(transportRef.current.getQueues());
    setTransportMetrics(transportRef.current.getMetrics());
    setActiveTab('board');
  };

  const handleResetDemo = () => {
    clearReplicaStorage();
    let base = createInitialDoc('00000000000000000000000000000001');
    base = addTaskToDoc(base, {
      taskId: 'T1',
      title: 'Sound System Setup',
      ownerId: 'Meera',
      status: 'in-progress',
      archived: false,
    });
    base = addTaskToDoc(base, {
      taskId: 'T2',
      title: 'VIP Lounge Catering',
      ownerId: 'Arjun',
      status: 'todo',
      archived: false,
    });

    const baseBytes = Automerge.save(base);
    setDocA(loadDocFromBytes(baseBytes, ACTOR_MEERA));
    setDocB(loadDocFromBytes(baseBytes, ACTOR_ARJUN));
    syncStateARef.current = Automerge.initSyncState();
    syncStateBRef.current = Automerge.initSyncState();
    transportRef.current.clearQueues();
    transportRef.current.isBridgeConnected = false;
    setQueues(transportRef.current.getQueues());
    setTransportMetrics(transportRef.current.getMetrics());
    setActiveScenarioId(null);
  };

  // State checks
  const conflictsA = getAllDocConflicts(docA);
  const headsA = Automerge.getHeads(docA);
  const headsB = Automerge.getHeads(docB);
  const isConverged =
    headsA.length === headsB.length && headsA.every((h, i) => h === headsB[i]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-ink">
      <HeaderRail
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metrics={transportMetrics}
        conflictCount={conflictsA.length}
        isConverged={isConverged}
        onResetDemo={handleResetDemo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'board' && (
          <div className="space-y-4">
            {/* Mobile Replica Switcher (390px view) */}
            <div className="md:hidden flex rounded-lg border border-stone-300 p-1 bg-white mb-2 text-xs font-bold">
              <button
                onClick={() => setMobileActiveReplica('A')}
                className={`flex-1 py-1.5 rounded-md ${
                  mobileActiveReplica === 'A' ? 'bg-replicaA text-white' : 'text-stone-600'
                }`}
              >
                Meera (Replica A)
              </button>
              <button
                onClick={() => setMobileActiveReplica('B')}
                className={`flex-1 py-1.5 rounded-md ${
                  mobileActiveReplica === 'B' ? 'bg-replicaB text-white' : 'text-stone-600'
                }`}
              >
                Arjun (Replica B)
              </button>
            </div>

            {/* Desktop Side-by-Side Board Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Left Column: Replica A (Meera) */}
              <div
                className={`md:col-span-5 ${
                  mobileActiveReplica === 'A' ? 'block' : 'hidden md:block'
                }`}
              >
                <ReplicaPanel
                  replicaId="A"
                  coordinatorName="Meera"
                  themeColor="cobalt"
                  doc={docA}
                  onUpdateOwner={(tId, owner) => handleUpdateOwner('A', tId, owner)}
                  onUpdateStatus={(tId, status) => handleUpdateStatus('A', tId, status)}
                  onAddNote={(tId, text) => handleAddNote('A', tId, text)}
                  onAcknowledgeHandoff={(tId) => handleAcknowledgeHandoff('A', tId)}
                  onNavigateToResolve={() => setActiveTab('conflicts')}
                  persistenceStatus={persistenceStatus}
                />
              </div>

              {/* Center Column: Controlled Transport Bridge */}
              <div className="md:col-span-2">
                <TransportBridge
                  metrics={transportMetrics}
                  queues={queues}
                  onToggleConnection={() => {
                    transportRef.current.isBridgeConnected =
                      !transportRef.current.isBridgeConnected;
                    setTransportMetrics(transportRef.current.getMetrics());
                  }}
                  onDeliverNext={deliverNextPacket}
                  onDrainQuiescence={handleDrainQuiescence}
                  onDuplicatePacket={(dir) => {
                    transportRef.current.duplicateLast(dir);
                    setQueues(transportRef.current.getQueues());
                  }}
                  onDropPacket={(dir) => {
                    transportRef.current.dropNext(dir);
                    setQueues(transportRef.current.getQueues());
                  }}
                  isSyncing={isSyncing}
                />
              </div>

              {/* Right Column: Replica B (Arjun) */}
              <div
                className={`md:col-span-5 ${
                  mobileActiveReplica === 'B' ? 'block' : 'hidden md:block'
                }`}
              >
                <ReplicaPanel
                  replicaId="B"
                  coordinatorName="Arjun"
                  themeColor="terracotta"
                  doc={docB}
                  onUpdateOwner={(tId, owner) => handleUpdateOwner('B', tId, owner)}
                  onUpdateStatus={(tId, status) => handleUpdateStatus('B', tId, status)}
                  onAddNote={(tId, text) => handleAddNote('B', tId, text)}
                  onAcknowledgeHandoff={(tId) => handleAcknowledgeHandoff('B', tId)}
                  onNavigateToResolve={() => setActiveTab('conflicts')}
                  persistenceStatus={persistenceStatus}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'conflicts' && (
          <ConflictInboxView
            docA={docA}
            docB={docB}
            onResolveConflict={handleResolveConflict}
          />
        )}

        {activeTab === 'history' && (
          <HistoryInspectorView docA={docA} docB={docB} eventLog={eventLog} />
        )}

        {activeTab === 'scenarios' && (
          <GuidedScenariosView
            onLoadScenario={handleLoadScenario}
            activeScenarioId={activeScenarioId}
          />
        )}

        {activeTab === 'export' && (
          <ExportAndMethodView docA={docA} docB={docB} metrics={transportMetrics} />
        )}
      </main>

      <footer className="border-t border-stone-300 bg-white py-4 text-center text-xs text-stone-500 font-mono">
        RELAY · Causal Handoff Acknowledgments · Automerge v3.5 CRDT Lab · Zero-Cloud Static Artifact
      </footer>
    </div>
  );
};

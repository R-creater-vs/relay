import * as Automerge from '@automerge/automerge';
import type { TransportEnvelope, TransportMetrics, RelayDoc } from '../domain/types';

export class TransportSimulator {
  private outboxAtoB: TransportEnvelope[] = [];
  private outboxBtoA: TransportEnvelope[] = [];
  private sequenceCounter = 0;

  public isBridgeConnected = false; // Disconnected by default for laboratory
  public totalDeliveredMessages = 0;
  public totalDeliveredBytes = 0;

  constructor(initiallyConnected = false) {
    this.isBridgeConnected = initiallyConnected;
  }

  public enqueueMessage(
    from: 'A' | 'B',
    payload: Uint8Array
  ): TransportEnvelope {
    this.sequenceCounter++;
    const envelope: TransportEnvelope = {
      messageId: `msg-${from}-${this.sequenceCounter}-${Date.now()}`,
      sourceReplicaId: from === 'A' ? 'replica-a' : 'replica-b',
      targetReplicaId: from === 'A' ? 'replica-b' : 'replica-a',
      payloadBytes: payload,
      enqueueSequence: this.sequenceCounter,
      deliveryState: 'queued',
      timestampMs: Date.now(),
    };

    if (from === 'A') {
      this.outboxAtoB.push(envelope);
    } else {
      this.outboxBtoA.push(envelope);
    }

    return envelope;
  }

  public deliverNext(
    direction: 'AtoB' | 'BtoA'
  ): TransportEnvelope | null {
    const queue = direction === 'AtoB' ? this.outboxAtoB : this.outboxBtoA;
    if (queue.length === 0) return null;

    const envelope = queue.shift()!;
    envelope.deliveryState = 'delivered';
    this.totalDeliveredMessages++;
    this.totalDeliveredBytes += envelope.payloadBytes.byteLength;
    return envelope;
  }

  public duplicateLast(direction: 'AtoB' | 'BtoA'): TransportEnvelope | null {
    const queue = direction === 'AtoB' ? this.outboxAtoB : this.outboxBtoA;
    if (queue.length === 0) return null;

    const original = queue[queue.length - 1];
    this.sequenceCounter++;
    const dup: TransportEnvelope = {
      ...original,
      messageId: `${original.messageId}-dup-${this.sequenceCounter}`,
      enqueueSequence: this.sequenceCounter,
      deliveryState: 'queued',
      timestampMs: Date.now(),
    };
    queue.push(dup);
    return dup;
  }

  public dropNext(direction: 'AtoB' | 'BtoA'): TransportEnvelope | null {
    const queue = direction === 'AtoB' ? this.outboxAtoB : this.outboxBtoA;
    if (queue.length === 0) return null;
    const dropped = queue.shift()!;
    dropped.deliveryState = 'dropped';
    return dropped;
  }

  public getMetrics(): TransportMetrics {
    return {
      totalDeliveredMessages: this.totalDeliveredMessages,
      totalDeliveredBytes: this.totalDeliveredBytes,
      pendingAtoBCount: this.outboxAtoB.length,
      pendingBtoACount: this.outboxBtoA.length,
      isQuiescent: this.outboxAtoB.length === 0 && this.outboxBtoA.length === 0,
      isBridgeConnected: this.isBridgeConnected,
    };
  }

  public getQueues() {
    return {
      outboxAtoB: [...this.outboxAtoB],
      outboxBtoA: [...this.outboxBtoA],
    };
  }

  public clearQueues() {
    this.outboxAtoB = [];
    this.outboxBtoA = [];
  }

  /**
   * Full quiescence drain between two Automerge documents
   */
  public drainSyncSession(
    docA: Automerge.Doc<RelayDoc>,
    syncA: Automerge.SyncState,
    docB: Automerge.Doc<RelayDoc>,
    syncB: Automerge.SyncState,
    maxIterations = 20
  ): {
    docA: Automerge.Doc<RelayDoc>;
    syncA: Automerge.SyncState;
    docB: Automerge.Doc<RelayDoc>;
    syncB: Automerge.SyncState;
    rounds: number;
    messagesExchanged: number;
    bytesExchanged: number;
  } {
    let currentDocA = docA;
    let currentSyncA = syncA;
    let currentDocB = docB;
    let currentSyncB = syncB;

    let rounds = 0;
    let messagesExchanged = 0;
    let bytesExchanged = 0;

    while (rounds < maxIterations) {
      rounds++;
      const [nextSyncA, msgAtoB] = Automerge.generateSyncMessage(currentDocA, currentSyncA);
      currentSyncA = nextSyncA;

      const [nextSyncB, msgBtoA] = Automerge.generateSyncMessage(currentDocB, currentSyncB);
      currentSyncB = nextSyncB;

      if (!msgAtoB && !msgBtoA) {
        break; // Quiescence
      }

      if (msgAtoB) {
        messagesExchanged++;
        bytesExchanged += msgAtoB.byteLength;
        const [nextDocB, nextSyncStateB] = Automerge.receiveSyncMessage(
          currentDocB,
          currentSyncB,
          msgAtoB
        );
        currentDocB = nextDocB;
        currentSyncB = nextSyncStateB;
      }

      if (msgBtoA) {
        messagesExchanged++;
        bytesExchanged += msgBtoA.byteLength;
        const [nextDocA, nextSyncStateA] = Automerge.receiveSyncMessage(
          currentDocA,
          currentSyncA,
          msgBtoA
        );
        currentDocA = nextDocA;
        currentSyncA = nextSyncStateA;
      }
    }

    this.totalDeliveredMessages += messagesExchanged;
    this.totalDeliveredBytes += bytesExchanged;

    return {
      docA: currentDocA,
      syncA: currentSyncA,
      docB: currentDocB,
      syncB: currentSyncB,
      rounds,
      messagesExchanged,
      bytesExchanged,
    };
  }
}

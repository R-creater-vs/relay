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

export interface FieldConflict {
  field: 'ownerId' | 'status' | 'title';
  currentWinningValue: string;
  competingValues: Array<{
    changeId: string;
    value: string;
    author: string;
  }>;
}

export interface TaskConflictSummary {
  taskId: string;
  taskTitle: string;
  conflicts: FieldConflict[];
}

export interface AcknowledgmentValidityResult {
  isValid: boolean;
  reason: 'valid' | 'content_mismatch' | 'unresolved_conflicts' | 'intervening_relevant_history' | 'task_not_found';
  explanation: string;
  staleDifferences?: {
    field: string;
    acknowledgedValue: string;
    currentValue: string;
  }[];
}

export interface TransportEnvelope {
  messageId: string;
  sourceReplicaId: string;
  targetReplicaId: string;
  payloadBytes: Uint8Array;
  enqueueSequence: number;
  deliveryState: 'queued' | 'delivered' | 'dropped';
  timestampMs: number;
}

export interface TransportMetrics {
  totalDeliveredMessages: number;
  totalDeliveredBytes: number;
  pendingAtoBCount: number;
  pendingBtoACount: number;
  isQuiescent: boolean;
  isBridgeConnected: boolean;
}

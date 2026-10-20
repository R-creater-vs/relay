import * as Automerge from '@automerge/automerge';
import type {
  RelayDoc,
  Task,
  TaskStatus,
  HandoffAcknowledgment,
  ResolutionRecord,
  TaskConflictSummary,
  FieldConflict,
  AcknowledgmentValidityResult,
} from './types';

export const ACTOR_MEERA = '11111111111111111111111111111111';
export const ACTOR_ARJUN = '22222222222222222222222222222222';

export function computeTaskDigest(task: Task): string {
  const raw = `${task.taskId}:${task.title}:${task.ownerId}:${task.status}:${task.archived}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `TR-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function createInitialDoc(actorId: string): Automerge.Doc<RelayDoc> {
  let doc = Automerge.init<RelayDoc>({ actor: actorId });
  doc = Automerge.change(doc, 'Initialize empty relay schema', (d) => {
    d.tasks = {};
    d.resolutions = {};
    d.acknowledgments = {};
  });
  return doc;
}

export function loadDocFromBytes(bytes: Uint8Array, actorId: string): Automerge.Doc<RelayDoc> {
  return Automerge.load<RelayDoc>(bytes, { actor: actorId });
}

export function addTaskToDoc(
  doc: Automerge.Doc<RelayDoc>,
  task: Omit<Task, 'notesById'>
): Automerge.Doc<RelayDoc> {
  return Automerge.change(doc, `Add task ${task.taskId}`, (d) => {
    d.tasks[task.taskId] = {
      ...task,
      notesById: {},
    };
  });
}

export function updateTaskFieldInDoc(
  doc: Automerge.Doc<RelayDoc>,
  taskId: string,
  field: 'ownerId' | 'status' | 'title',
  value: string
): Automerge.Doc<RelayDoc> {
  return Automerge.change(doc, `Update ${field} of ${taskId} to ${value}`, (d) => {
    const target = d.tasks[taskId];
    if (target) {
      if (field === 'ownerId') target.ownerId = value;
      else if (field === 'status') target.status = value as TaskStatus;
      else if (field === 'title') target.title = value;
    }
  });
}

export function addNoteToDoc(
  doc: Automerge.Doc<RelayDoc>,
  taskId: string,
  authorId: string,
  text: string
): Automerge.Doc<RelayDoc> {
  const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  return Automerge.change(doc, `Add note to ${taskId} by ${authorId}`, (d) => {
    const target = d.tasks[taskId];
    if (target) {
      if (!target.notesById) target.notesById = {};
      target.notesById[noteId] = {
        noteId,
        authorId,
        text,
        createdAtMs: Date.now(),
      };
    }
  });
}

export function recordAcknowledgmentInDoc(
  doc: Automerge.Doc<RelayDoc>,
  taskId: string,
  actorIdentity: string
): { doc: Automerge.Doc<RelayDoc>; ackId: string } {
  const task = doc.tasks[taskId];
  if (!task) throw new Error(`Task ${taskId} not found`);

  const heads = Automerge.getHeads(doc);
  const digest = computeTaskDigest(task);
  const ackId = `ack-${taskId}-${Date.now()}`;

  const noteKeys = Object.keys(task.notesById || {});
  const latestNoteId = noteKeys.length > 0 ? noteKeys[noteKeys.length - 1] : null;

  const ack: HandoffAcknowledgment = {
    ackId,
    taskId,
    owner: task.ownerId,
    status: task.status,
    latestNoteId,
    relevantKnownChangeHeads: heads,
    acknowledgedByIdentity: actorIdentity,
    acknowledgedAtMs: Date.now(),
    contentDigest: digest,
  };

  const nextDoc = Automerge.change(doc, `Acknowledge task ${taskId} by ${actorIdentity}`, (d) => {
    if (!d.acknowledgments) d.acknowledgments = {};
    d.acknowledgments[ackId] = ack;
  });

  return { doc: nextDoc, ackId };
}

export function resolveConflictInDoc(
  doc: Automerge.Doc<RelayDoc>,
  taskId: string,
  field: 'ownerId' | 'status' | 'title',
  selectedValue: string,
  resolverId: string,
  reason: string
): Automerge.Doc<RelayDoc> {
  const task = doc.tasks[taskId];
  if (!task) return doc;

  const rawConflicts = Automerge.getConflicts(task, field) || {};
  const conflictIds = Object.keys(rawConflicts);
  const competing = Object.values(rawConflicts).map((v) => String(v));

  const resId = `res-${taskId}-${Date.now()}`;
  const record: ResolutionRecord = {
    resolutionId: resId,
    taskId,
    field,
    observedConflictIds: conflictIds,
    competingValues: competing,
    selectedValue,
    resolverId,
    reason: reason || 'Explicit coordinator agreement',
    resolvedAtMs: Date.now(),
  };

  return Automerge.change(
    doc,
    `Resolve conflict on ${taskId}.${field} to ${selectedValue} by ${resolverId}`,
    (d) => {
      const t = d.tasks[taskId];
      if (t) {
        if (field === 'ownerId') t.ownerId = selectedValue;
        else if (field === 'status') t.status = selectedValue as TaskStatus;
        else if (field === 'title') t.title = selectedValue;
      }
      if (!d.resolutions) d.resolutions = {};
      d.resolutions[resId] = record;
    }
  );
}

export function getTaskConflicts(
  doc: Automerge.Doc<RelayDoc>,
  taskId: string
): TaskConflictSummary | null {
  const task = doc.tasks[taskId];
  if (!task) return null;

  const fields: Array<'ownerId' | 'status' | 'title'> = ['ownerId', 'status', 'title'];
  const conflicts: FieldConflict[] = [];

  for (const field of fields) {
    const rawConflicts = Automerge.getConflicts(task, field);
    if (rawConflicts && Object.keys(rawConflicts).length > 1) {
      const competing = Object.entries(rawConflicts).map(([changeId, value]) => ({
        changeId,
        value: String(value),
        author: changeId.includes(ACTOR_MEERA)
          ? 'Meera (Cobalt)'
          : changeId.includes(ACTOR_ARJUN)
          ? 'Arjun (Terracotta)'
          : 'Collaborator',
      }));

      conflicts.push({
        field,
        currentWinningValue: String(task[field]),
        competingValues: competing,
      });
    }
  }

  if (conflicts.length === 0) return null;

  return {
    taskId,
    taskTitle: task.title,
    conflicts,
  };
}

export function getAllDocConflicts(doc: Automerge.Doc<RelayDoc>): TaskConflictSummary[] {
  const results: TaskConflictSummary[] = [];
  for (const taskId of Object.keys(doc.tasks || {})) {
    const summary = getTaskConflicts(doc, taskId);
    if (summary) results.push(summary);
  }
  return results;
}

/**
 * Mandatory Differentiating Predicate: Acknowledgment Validity
 */
export function checkAcknowledgmentValidity(
  doc: Automerge.Doc<RelayDoc>,
  ack: HandoffAcknowledgment
): AcknowledgmentValidityResult {
  const task = doc.tasks[ack.taskId];
  if (!task) {
    return {
      isValid: false,
      reason: 'task_not_found',
      explanation: `Task ${ack.taskId} does not exist in current document.`,
    };
  }

  // 1. Content check
  const staleDiffs: Array<{ field: string; acknowledgedValue: string; currentValue: string }> = [];
  if (task.ownerId !== ack.owner) {
    staleDiffs.push({
      field: 'ownerId',
      acknowledgedValue: ack.owner,
      currentValue: task.ownerId,
    });
  }
  if (task.status !== ack.status) {
    staleDiffs.push({
      field: 'status',
      acknowledgedValue: ack.status,
      currentValue: task.status,
    });
  }

  if (staleDiffs.length > 0) {
    return {
      isValid: false,
      reason: 'content_mismatch',
      explanation: `Task state has changed since acknowledgment was signed by ${ack.acknowledgedByIdentity}.`,
      staleDifferences: staleDiffs,
    };
  }

  // 2. Unresolved conflicts check on relevant fields
  const ownerConflicts = Automerge.getConflicts(task, 'ownerId');
  const statusConflicts = Automerge.getConflicts(task, 'status');
  const hasConflicts =
    (ownerConflicts && Object.keys(ownerConflicts).length > 1) ||
    (statusConflicts && Object.keys(statusConflicts).length > 1);

  if (hasConflicts) {
    return {
      isValid: false,
      reason: 'unresolved_conflicts',
      explanation: `Unresolved concurrent edits exist on relevant fields of ${ack.taskId}.`,
    };
  }

  // 3. Causal ancestry check:
  // If heads have progressed, verify that no unseen concurrent change intervened
  const currentHeads = Automerge.getHeads(doc);
  const sameHeads =
    currentHeads.length === ack.relevantKnownChangeHeads.length &&
    currentHeads.every((h, i) => h === ack.relevantKnownChangeHeads[i]);

  if (!sameHeads) {
    // Check if current digest equals acknowledged digest
    const currentDigest = computeTaskDigest(task);
    if (currentDigest !== ack.contentDigest) {
      return {
        isValid: false,
        reason: 'intervening_relevant_history',
        explanation: `Task content digest changed from ${ack.contentDigest} to ${currentDigest}.`,
      };
    }
  }

  return {
    isValid: true,
    reason: 'valid',
    explanation: `Task matches acknowledged state exactly with zero relevant conflicts.`,
  };
}

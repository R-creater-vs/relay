import React, { useState } from 'react';
import * as Automerge from '@automerge/automerge';
import {
  User,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Database,
} from 'lucide-react';
import { RelayDoc, TaskStatus } from '../../domain/types';
import {
  getTaskConflicts,
  checkAcknowledgmentValidity,
} from '../../domain/crdt';

interface ReplicaPanelProps {
  replicaId: 'A' | 'B';
  coordinatorName: string;
  themeColor: 'cobalt' | 'terracotta';
  doc: Automerge.Doc<RelayDoc>;
  onUpdateOwner: (taskId: string, newOwner: string) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onAddNote: (taskId: string, text: string) => void;
  onAcknowledgeHandoff: (taskId: string) => void;
  onNavigateToResolve: (taskId: string) => void;
  persistenceStatus: 'saved' | 'saving' | 'error';
}

export const ReplicaPanel: React.FC<ReplicaPanelProps> = ({
  replicaId,
  coordinatorName,
  doc,
  onUpdateOwner,
  onUpdateStatus,
  onAddNote,
  onAcknowledgeHandoff,
  onNavigateToResolve,
  persistenceStatus,
}) => {
  const isA = replicaId === 'A';
  const colorClass = isA ? 'text-replicaA-dark' : 'text-replicaB-dark';
  const bgClass = isA ? 'bg-replicaA-light/50 border-replicaA-border' : 'bg-replicaB-light/50 border-replicaB-border';
  const badgeClass = isA ? 'bg-replicaA text-white' : 'bg-replicaB text-white';

  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const tasksList = Object.values(doc.tasks || {});
  const heads = Automerge.getHeads(doc);

  const handleAddNoteSubmit = (taskId: string) => {
    const text = noteInputs[taskId]?.trim();
    if (!text) return;
    onAddNote(taskId, text);
    setNoteInputs((prev) => ({ ...prev, [taskId]: '' }));
  };

  return (
    <div className={`rounded-xl border ${bgClass} p-5 flex flex-col justify-between shadow-xs`}>
      {/* Panel Header */}
      <div>
        <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className={`w-6 h-6 rounded-md ${badgeClass} font-mono font-bold text-xs flex items-center justify-center shadow-2xs`}>
              {replicaId}
            </span>
            <div>
              <h2 className={`text-base font-bold font-sans ${colorClass}`}>
                {coordinatorName}’s Replica
              </h2>
              <span className="text-[11px] font-mono text-stone-500">
                Actor ID: {isA ? '1111...1111 (Cobalt)' : '2222...2222 (Terracotta)'}
              </span>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <div className="flex items-center gap-1.5 text-stone-600 justify-end">
              <Database className="w-3.5 h-3.5 text-stone-400" />
              <span className="capitalize">{persistenceStatus}</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Heads: {heads.length} op{heads.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Task Cards Stack */}
        <div className="mt-4 space-y-4">
          {tasksList.map((task) => {
            const conflicts = getTaskConflicts(doc, task.taskId);
            const taskAcks = Object.values(doc.acknowledgments || {}).filter(
              (a) => a.taskId === task.taskId
            );
            // Latest acknowledgment
            const latestAck = taskAcks.length > 0 ? taskAcks[taskAcks.length - 1] : null;
            const ackValidity = latestAck ? checkAcknowledgmentValidity(doc, latestAck) : null;

            return (
              <div
                key={task.taskId}
                className="bg-white rounded-lg border border-stone-300 p-4 shadow-2xs space-y-3"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">
                      {task.taskId}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 leading-snug">{task.title}</h3>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={task.status}
                    onChange={(e) => onUpdateStatus(task.taskId, e.target.value as TaskStatus)}
                    className="text-xs font-mono font-semibold rounded px-2 py-1 bg-stone-100 border border-stone-300 text-stone-800 focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <option value="todo">todo</option>
                    <option value="in-progress">in-progress</option>
                    <option value="blocked">blocked</option>
                    <option value="done">done</option>
                  </select>
                </div>

                {/* Owner Field & Quick Reassign */}
                <div className="bg-stone-50 rounded-md p-2.5 border border-stone-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-stone-600 font-medium">Assigned Owner:</span>
                    <span className="font-bold text-stone-900 font-mono">{task.ownerId}</span>
                  </div>

                  {/* Reassign buttons */}
                  <div className="flex items-center gap-1 text-[11px] font-sans">
                    <button
                      onClick={() => onUpdateOwner(task.taskId, 'Meera')}
                      className={`px-2 py-0.5 rounded border ${
                        task.ownerId === 'Meera'
                          ? 'bg-replicaA text-white border-replicaA'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                      }`}
                    >
                      Meera
                    </button>
                    <button
                      onClick={() => onUpdateOwner(task.taskId, 'Arjun')}
                      className={`px-2 py-0.5 rounded border ${
                        task.ownerId === 'Arjun'
                          ? 'bg-replicaB text-white border-replicaB'
                          : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-300'
                      }`}
                    >
                      Arjun
                    </button>
                  </div>
                </div>

                {/* Active Conflict Warning Banner */}
                {conflicts && (
                  <div className="bg-rose-50 border border-rose-300 rounded-md p-2.5 text-xs text-rose-900 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-bold">
                          Concurrent Conflict on {conflicts.conflicts.map((c) => c.field).join(', ')}
                        </div>
                        <div className="text-[11px] text-rose-700 mt-0.5 font-mono">
                          Competing:{' '}
                          {conflicts.conflicts
                            .flatMap((c) => c.competingValues.map((v) => `"${v.value}" (${v.author})`))
                            .join(' vs ')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToResolve(task.taskId)}
                      className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] shrink-0 transition-colors shadow-2xs"
                    >
                      Resolve
                    </button>
                  </div>
                )}

                {/* Mandatory Differentiator: Handoff Acknowledgment Banner */}
                <div className="border-t border-stone-200 pt-2.5 text-xs">
                  {latestAck && ackValidity ? (
                    <div
                      className={`p-2 rounded-md border flex items-start justify-between gap-2 ${
                        ackValidity.isValid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        {ackValidity.isValid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold flex items-center gap-1.5 font-mono text-[11px]">
                            {ackValidity.isValid ? (
                              <span>✓ Valid Handoff Acknowledgment</span>
                            ) : (
                              <span>⚠️ Acknowledgment Became Stale</span>
                            )}
                            <span className="text-stone-400 font-normal">
                              by {latestAck.acknowledgedByIdentity}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 mt-0.5">
                            {ackValidity.isValid ? (
                              <span>
                                Exact observed state: Owner <code>{latestAck.owner}</code> · Status{' '}
                                <code>{latestAck.status}</code>
                              </span>
                            ) : (
                              <span className="text-amber-800 font-medium">
                                {ackValidity.explanation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onAcknowledgeHandoff(task.taskId)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-medium text-[10px] shrink-0 transition-colors"
                      >
                        Re-Acknowledge
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-stone-500">
                      <span className="text-[11px]">Handoff unacknowledged</span>
                      <button
                        onClick={() => onAcknowledgeHandoff(task.taskId)}
                        className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white font-medium text-[11px] transition-colors"
                      >
                        Acknowledge Handoff
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes List & Append Input */}
                <div className="border-t border-stone-100 pt-2 text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium mb-1.5">
                    <MessageSquare className="w-3 h-3" />
                    <span>Handoff Notes ({Object.keys(task.notesById || {}).length})</span>
                  </div>

                  {Object.values(task.notesById || {}).map((n) => (
                    <div
                      key={n.noteId}
                      className="bg-stone-50 rounded p-1.5 border border-stone-200 text-[11px] text-stone-700 mb-1"
                    >
                      <strong className="text-stone-900">{n.authorId}:</strong> {n.text}
                    </div>
                  ))}

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <input
                      type="text"
                      placeholder="Add handoff note..."
                      value={noteInputs[task.taskId] || ''}
                      onChange={(e) =>
                        setNoteInputs((prev) => ({ ...prev, [task.taskId]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNoteSubmit(task.taskId)}
                      className="flex-1 px-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-ink"
                    />
                    <button
                      onClick={() => handleAddNoteSubmit(task.taskId)}
                      className="px-2 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium text-xs transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

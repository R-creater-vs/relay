import React, { useState } from 'react';
import * as Automerge from '@automerge/automerge';
import { GitMerge, CheckCircle2, Check } from 'lucide-react';
import { RelayDoc } from '../../domain/types';
import { getAllDocConflicts } from '../../domain/crdt';

interface ConflictInboxViewProps {
  docA: Automerge.Doc<RelayDoc>;
  docB: Automerge.Doc<RelayDoc>;
  onResolveConflict: (
    taskId: string,
    field: 'ownerId' | 'status' | 'title',
    selectedValue: string,
    reason: string
  ) => void;
}

export const ConflictInboxView: React.FC<ConflictInboxViewProps> = ({
  docA,
  onResolveConflict,
}) => {
  const conflictsA = getAllDocConflicts(docA);

  const [selectedResolutions, setSelectedResolutions] = useState<
    Record<string, { value: string; custom: string; reason: string }>
  >({});

  const handleSelectChoice = (taskId: string, field: string, choiceValue: string) => {
    const key = `${taskId}.${field}`;
    setSelectedResolutions((prev) => ({
      ...prev,
      [key]: {
        value: choiceValue,
        custom: '',
        reason: prev[key]?.reason || 'Explicit coordinator agreement',
      },
    }));
  };

  const handleCustomChange = (taskId: string, field: string, customVal: string) => {
    const key = `${taskId}.${field}`;
    setSelectedResolutions((prev) => ({
      ...prev,
      [key]: {
        value: customVal,
        custom: customVal,
        reason: prev[key]?.reason || 'Negotiated compromise',
      },
    }));
  };

  const handleReasonChange = (taskId: string, field: string, reason: string) => {
    const key = `${taskId}.${field}`;
    setSelectedResolutions((prev) => ({
      ...prev,
      [key]: {
        value: prev[key]?.value || '',
        custom: prev[key]?.custom || '',
        reason,
      },
    }));
  };

  const handleCommitResolution = (taskId: string, field: 'ownerId' | 'status' | 'title') => {
    const key = `${taskId}.${field}`;
    const choice = selectedResolutions[key];
    if (!choice || !choice.value) return;

    onResolveConflict(taskId, field, choice.value, choice.reason);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-300 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-rose-100 text-rose-800 font-semibold border border-rose-200">
            CRDT Multi-Value Register
          </span>
          <span className="text-xs text-stone-500 font-mono">
            {conflictsA.length} Active Task Disagreement{conflictsA.length !== 1 ? 's' : ''}
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink mt-1.5">
          Conflict Inbox & Explicit Resolution Desk
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
          When two coordinators make concurrent offline changes to the same task, Automerge deterministically renders a winning value without silently deleting the other. RELAY surfaces both alternatives in context so humans can make an explicit operational decision.
        </p>
      </div>

      {/* Conflicts List or Empty State */}
      {conflictsA.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-300 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">Zero Unresolved Conflicts</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            All task fields have converged with no competing concurrent alternatives in document history.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflictsA.map((taskConflict) => (
            <div
              key={taskConflict.taskId}
              className="bg-white rounded-xl border-2 border-rose-300 p-5 shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700">
                    Disagreement Detected · Task {taskConflict.taskId}
                  </span>
                  <h3 className="text-base font-bold text-stone-900 mt-0.5">
                    {taskConflict.taskTitle}
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 font-mono font-semibold">
                  Multi-Value Conflict
                </span>
              </div>

              {taskConflict.conflicts.map((fieldConf) => {
                const key = `${taskConflict.taskId}.${fieldConf.field}`;
                const currentChoice = selectedResolutions[key]?.value || '';

                return (
                  <div key={fieldConf.field} className="space-y-3">
                    <div className="text-xs font-mono font-semibold text-stone-700 uppercase">
                      Competing Alternatives for: <span className="text-ink">{fieldConf.field}</span>
                    </div>

                    {/* Side-by-side alternative cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fieldConf.competingValues.map((alt) => {
                        const isSelected = currentChoice === alt.value;
                        const isMeera = alt.author.includes('Meera');

                        return (
                          <div
                            key={alt.changeId}
                            onClick={() =>
                              handleSelectChoice(taskConflict.taskId, fieldConf.field, alt.value)
                            }
                            className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? isMeera
                                  ? 'border-replicaA bg-replicaA-light/40 shadow-xs ring-1 ring-replicaA'
                                  : 'border-replicaB bg-replicaB-light/40 shadow-xs ring-1 ring-replicaB'
                                : 'border-stone-200 hover:border-stone-400 bg-stone-50/60'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  isMeera
                                    ? 'bg-replicaA text-white'
                                    : 'bg-replicaB text-white'
                                }`}
                              >
                                {alt.author}
                              </span>
                              {isSelected && (
                                <span className="text-xs font-bold font-mono text-emerald-700 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Selected
                                </span>
                              )}
                            </div>

                            <div className="text-base font-bold font-mono text-stone-900 mt-2">
                              “{alt.value}”
                            </div>
                            <div className="text-[10px] font-mono text-stone-400 mt-1 truncate">
                              Op: {alt.changeId}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Negotiated Compromise & Reason Drawer */}
                    <div className="bg-stone-50 rounded-lg p-3.5 border border-stone-200 space-y-2.5 text-xs">
                      <div>
                        <label className="font-semibold text-stone-700 block mb-1">
                          Or Enter a Negotiated Compromise Value:
                        </label>
                        <input
                          type="text"
                          placeholder='e.g. "Meera & Arjun" (Co-Owners)'
                          value={selectedResolutions[key]?.custom || ''}
                          onChange={(e) =>
                            handleCustomChange(taskConflict.taskId, fieldConf.field, e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-ink"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-stone-700 block mb-1">
                          Operational Reason / Resolution Note:
                        </label>
                        <input
                          type="text"
                          placeholder="Why was this choice selected?"
                          value={selectedResolutions[key]?.reason || ''}
                          onChange={(e) =>
                            handleReasonChange(taskConflict.taskId, fieldConf.field, e.target.value)
                          }
                          className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-ink"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleCommitResolution(taskConflict.taskId, fieldConf.field)}
                          disabled={!currentChoice}
                          className="py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
                        >
                          <GitMerge className="w-4 h-4" />
                          Commit Resolution: “{currentChoice || 'None'}”
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

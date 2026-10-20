import React, { useState } from 'react';
import * as Automerge from '@automerge/automerge';
import { Clock, FileCode, Layers } from 'lucide-react';
import { RelayDoc, TransportEnvelope } from '../../domain/types';

interface HistoryInspectorViewProps {
  docA: Automerge.Doc<RelayDoc>;
  docB: Automerge.Doc<RelayDoc>;
  eventLog: Array<{
    id: string;
    timestamp: number;
    actor: string;
    type: 'edit' | 'sync' | 'conflict' | 'resolution' | 'acknowledgment';
    description: string;
    envelope?: TransportEnvelope;
  }>;
}

export const HistoryInspectorView: React.FC<HistoryInspectorViewProps> = ({
  docA,
  docB,
  eventLog,
}) => {
  const [selectedEnvelope, setSelectedEnvelope] = useState<TransportEnvelope | null>(null);

  const headsA = Automerge.getHeads(docA);
  const headsB = Automerge.getHeads(docB);
  const areHeadsEqual =
    headsA.length === headsB.length && headsA.every((h, i) => h === headsB[i]);

  const formatHex = (bytes: Uint8Array, maxBytes = 48) => {
    const slice = bytes.slice(0, maxBytes);
    let hex = '';
    for (let i = 0; i < slice.length; i++) {
      hex += slice[i].toString(16).padStart(2, '0') + ' ';
    }
    return hex + (bytes.length > maxBytes ? '...' : '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-300 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 font-semibold border border-stone-200">
            Causal Provenance
          </span>
          <span className="text-xs text-stone-500 font-mono">
            {eventLog.length} System Event{eventLog.length !== 1 ? 's' : ''} Recorded
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink mt-1.5">
          Transport Wire Receipts & Causal History Inspector
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
          Automerge tracks causal change ancestry rather than wall-clock timestamps. Inspect the exact sequence of offline local edits, incremental binary sync envelopes, and convergence milestones.
        </p>
      </div>

      {/* Heads Comparison Card */}
      <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-ink" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700">
              Automerge Document Heads Comparison
            </span>
          </div>

          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${
              areHeadsEqual
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-300'
            }`}
          >
            {areHeadsEqual ? 'Identical Heads (Converged)' : 'Diverged Heads'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-replicaA-light/40 border border-replicaA-border">
            <div className="font-bold text-replicaA-dark mb-1">Replica A Heads ({headsA.length}):</div>
            <div className="space-y-1">
              {headsA.map((h, i) => (
                <div key={i} className="text-stone-700 truncate" title={h}>
                  • {h}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-replicaB-light/40 border border-replicaB-border">
            <div className="font-bold text-replicaB-dark mb-1">Replica B Heads ({headsB.length}):</div>
            <div className="space-y-1">
              {headsB.map((h, i) => (
                <div key={i} className="text-stone-700 truncate" title={h}>
                  • {h}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Timeline & Envelope Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-300 p-5 shadow-xs">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-500" />
            Chronological Operation Ledger
          </h3>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
            {eventLog.map((ev) => {
              const isSelected = selectedEnvelope?.messageId === ev.envelope?.messageId;

              const badgeColor = () => {
                switch (ev.type) {
                  case 'edit':
                    return 'bg-stone-100 text-stone-800 border-stone-300';
                  case 'sync':
                    return 'bg-blue-50 text-blue-800 border-blue-200';
                  case 'conflict':
                    return 'bg-rose-50 text-rose-800 border-rose-200';
                  case 'resolution':
                    return 'bg-purple-50 text-purple-800 border-purple-200';
                  case 'acknowledgment':
                    return 'bg-emerald-50 text-emerald-800 border-emerald-200';
                }
              };

              return (
                <div
                  key={ev.id}
                  onClick={() => ev.envelope && setSelectedEnvelope(ev.envelope)}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    ev.envelope ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-400'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeColor()}`}
                    >
                      {ev.type.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-stone-400">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="mt-1.5 font-sans font-medium text-stone-900">
                    <strong className="text-ink font-semibold">{ev.actor}:</strong> {ev.description}
                  </div>

                  {ev.envelope && (
                    <div className="mt-2 pt-1.5 border-t border-stone-200 flex items-center justify-between text-[11px] font-mono text-stone-500">
                      <span>Envelope: {ev.envelope.payloadBytes.byteLength} bytes</span>
                      <span className="text-blue-600 hover:underline">Inspect Wire Bytes →</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wire Envelope Inspector (1 col) */}
        <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-600" />
              Wire Envelope Inspector
            </h3>

            {selectedEnvelope ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 space-y-1">
                  <div>
                    <span className="text-stone-400">Message ID:</span>{' '}
                    <span className="text-stone-800 break-all">{selectedEnvelope.messageId}</span>
                  </div>
                  <div>
                    <span className="text-stone-400">Route:</span>{' '}
                    <span className="text-stone-800 font-bold">
                      {selectedEnvelope.sourceReplicaId} → {selectedEnvelope.targetReplicaId}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400">Wire Size:</span>{' '}
                    <span className="text-stone-900 font-bold">
                      {selectedEnvelope.payloadBytes.byteLength} bytes
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400">Sequence:</span> #{selectedEnvelope.enqueueSequence}
                  </div>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px] block mb-1">
                    Raw Binary Hex Preview:
                  </span>
                  <div className="p-2 rounded bg-stone-900 text-emerald-400 text-[11px] font-mono break-all leading-relaxed max-h-48 overflow-y-auto">
                    {formatHex(selectedEnvelope.payloadBytes, 96)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-stone-400 text-xs">
                Select any sync message in the ledger to inspect its wire envelope bytes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

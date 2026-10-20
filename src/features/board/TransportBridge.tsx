import React from 'react';
import {
  Wifi,
  WifiOff,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  Trash2,
  Radio,
} from 'lucide-react';
import { TransportMetrics, TransportEnvelope } from '../../domain/types';

interface TransportBridgeProps {
  metrics: TransportMetrics;
  queues: {
    outboxAtoB: TransportEnvelope[];
    outboxBtoA: TransportEnvelope[];
  };
  onToggleConnection: () => void;
  onDeliverNext: (direction: 'AtoB' | 'BtoA') => void;
  onDrainQuiescence: () => void;
  onDuplicatePacket: (direction: 'AtoB' | 'BtoA') => void;
  onDropPacket: (direction: 'AtoB' | 'BtoA') => void;
  isSyncing: boolean;
}

export const TransportBridge: React.FC<TransportBridgeProps> = ({
  metrics,
  queues,
  onToggleConnection,
  onDeliverNext,
  onDrainQuiescence,
  onDuplicatePacket,
  onDropPacket,
  isSyncing,
}) => {
  const isConnected = metrics.isBridgeConnected;

  return (
    <div className="bg-white rounded-xl border border-stone-300 p-4 shadow-xs flex flex-col justify-between my-2 md:my-0">
      {/* Bridge Top: Connection Switcher */}
      <div className="text-center pb-3 border-b border-stone-200">
        <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-stone-500 mb-2">
          <Radio className="w-4 h-4 text-ink" />
          Transport Bridge
        </div>

        <button
          onClick={onToggleConnection}
          className={`w-full py-2 px-3 rounded-lg font-sans font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
            isConnected
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-stone-800 hover:bg-stone-900 text-white'
          }`}
        >
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-emerald-200" />
              <span>Bridge: Connected (Online)</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-300" />
              <span>Bridge: Disconnected (Offline)</span>
            </>
          )}
        </button>
      </div>

      {/* Middle: Queued Envelopes Visualizer */}
      <div className="py-4 space-y-4 text-xs font-mono">
        {/* Direction A -> B */}
        <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
          <div className="flex items-center justify-between text-stone-600 mb-1.5">
            <span className="flex items-center gap-1 font-bold text-replicaA">
              Meera → Arjun
            </span>
            <span className="text-[11px] font-semibold text-stone-700">
              {queues.outboxAtoB.length} queued
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onDeliverNext('AtoB')}
              disabled={queues.outboxAtoB.length === 0}
              className="flex-1 py-1 px-2 rounded bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-stone-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              Deliver 1 <ArrowRight className="w-3 h-3 text-replicaA" />
            </button>
            <button
              onClick={() => onDuplicatePacket('AtoB')}
              disabled={queues.outboxAtoB.length === 0}
              title="Duplicate last envelope (simulates network retry)"
              className="py-1 px-2 rounded bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-stone-600 text-[11px]"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDropPacket('AtoB')}
              disabled={queues.outboxAtoB.length === 0}
              title="Drop next envelope (adversarial control)"
              className="py-1 px-2 rounded bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-rose-600 text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Direction B -> A */}
        <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200">
          <div className="flex items-center justify-between text-stone-600 mb-1.5">
            <span className="flex items-center gap-1 font-bold text-replicaB">
              Arjun → Meera
            </span>
            <span className="text-[11px] font-semibold text-stone-700">
              {queues.outboxBtoA.length} queued
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onDeliverNext('BtoA')}
              disabled={queues.outboxBtoA.length === 0}
              className="flex-1 py-1 px-2 rounded bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-stone-800 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 text-replicaB" /> Deliver 1
            </button>
            <button
              onClick={() => onDuplicatePacket('BtoA')}
              disabled={queues.outboxBtoA.length === 0}
              title="Duplicate last envelope"
              className="py-1 px-2 rounded bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-stone-600 text-[11px]"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDropPacket('BtoA')}
              disabled={queues.outboxBtoA.length === 0}
              title="Drop next envelope"
              className="py-1 px-2 rounded bg-white hover:bg-stone-100 disabled:opacity-40 border border-stone-300 text-rose-600 text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bridge Bottom: Quiescence Drain */}
      <div className="pt-3 border-t border-stone-200 space-y-2">
        <button
          onClick={onDrainQuiescence}
          disabled={isSyncing}
          className="w-full py-2.5 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Drain to Quiescence</span>
        </button>

        <div className="text-[10px] text-center font-mono text-stone-500">
          Syncs until both Automerge documents reach identical heads.
        </div>
      </div>
    </div>
  );
};

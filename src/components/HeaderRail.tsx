import React from 'react';
import { Network, GitMerge, Clock, Play, FileJson, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TransportMetrics } from '../domain/types';

interface HeaderRailProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metrics: TransportMetrics;
  conflictCount: number;
  isConverged: boolean;
  onResetDemo: () => void;
}

export const HeaderRail: React.FC<HeaderRailProps> = ({
  activeTab,
  setActiveTab,
  metrics,
  conflictCount,
  isConverged,
  onResetDemo,
}) => {
  const navTabs = [
    { id: 'board', label: 'Operations Desk', icon: Network },
    {
      id: 'conflicts',
      label: `Conflict Inbox ${conflictCount > 0 ? `(${conflictCount})` : ''}`,
      icon: GitMerge,
      badge: conflictCount,
    },
    { id: 'history', label: 'Transport & Causal History', icon: Clock },
    { id: 'scenarios', label: 'Guided Scenarios', icon: Play },
    { id: 'export', label: 'Replay & Export', icon: FileJson },
  ];

  return (
    <header className="border-b border-stone-300 bg-white sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center text-white font-mono font-bold text-lg shadow-sm">
            RL
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-ink">RELAY</h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-stone-100 text-stone-600 border border-stone-200">
                Automerge v3.5
              </span>
              {isConverged ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Converged
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Diverged (Sync Pending)
                </span>
              )}
              {conflictCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 animate-pulse">
                  {conflictCount} Unresolved Conflict{conflictCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-sans">
              Local-First CRDT Lab · Causal Handoff Acknowledgments & Two-Replica Transport
            </p>
          </div>
        </div>

        {/* Bridge Status Summary & Reset */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5 flex items-center gap-3 text-stone-600">
            <span>
              Bridge:{' '}
              <strong className={metrics.isBridgeConnected ? 'text-emerald-700' : 'text-stone-700'}>
                {metrics.isBridgeConnected ? 'Connected' : 'Offline / Air-Gapped'}
              </strong>
            </span>
            <span>·</span>
            <span>
              Wire:{' '}
              <strong className="text-stone-900">{metrics.totalDeliveredBytes} bytes</strong> (
              {metrics.totalDeliveredMessages} msgs)
            </span>
          </div>

          <button
            onClick={onResetDemo}
            className="px-2.5 py-1.5 rounded border border-stone-300 hover:bg-stone-100 text-stone-700 font-sans text-xs transition-colors"
          >
            Reset Lab
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 border-t border-stone-200">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-ink text-ink font-bold bg-stone-100/60'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-ink' : 'text-stone-400'}`} />
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </header>
  );
};

import React from 'react';
import { Play, CheckCircle2 } from 'lucide-react';

interface GuidedScenariosViewProps {
  onLoadScenario: (scenarioId: string) => void;
  activeScenarioId: string | null;
}

export const GuidedScenariosView: React.FC<GuidedScenariosViewProps> = ({
  onLoadScenario,
  activeScenarioId,
}) => {
  const scenarios = [
    {
      id: 'sc-01-campus-conflict',
      title: '1. The Campus Reassignment Conflict',
      badge: 'Signature Showcase',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      description:
        'Both coordinators lose connectivity at a festival. Meera claims ownership of the sound system; Arjun simultaneously claims it on his device. When reconnected, RELAY converges without pretending their disagreement disappeared.',
      steps: [
        'Bridge disconnects (Air-gapped offline state)',
        'Meera assigns T1 owner to "Meera"; Arjun assigns T1 owner to "Arjun"',
        'Bridge re-establishes connection and drains sync messages',
        'Automerge exposes concurrent conflict in the Conflict Inbox',
        'Coordinators agree to co-lead: "Meera & Arjun" with recorded reason',
      ],
    },
    {
      id: 'sc-02-disjoint-merge',
      title: '2. Disjoint Multi-Task Collaboration',
      badge: 'Clean Merge',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description:
        'Meera updates Task T1 status while Arjun updates Task T2 owner. Because changes modify independent keys, Automerge merges them cleanly with zero conflict alerts.',
      steps: [
        'Bridge disconnects',
        'Meera marks T1 "in-progress"',
        'Arjun assigns T2 to "Arjun" and adds a handoff note',
        'Bridge drains to quiescence',
        'Both replicas reach identical document heads with 0 conflicts',
      ],
    },
    {
      id: 'sc-03-duplicate-delivery',
      title: '3. Duplicate Packet Injection (Idempotent Sync)',
      badge: 'Transport Fault',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      description:
        'Simulates real-world cellular packet retries where an already delivered Automerge sync message arrives twice. Proves the transport protocol is strictly idempotent.',
      steps: [
        'Meera updates Task T1 title',
        'Transport delivers sync packet to Arjun',
        'Transport injects duplicate of the delivered envelope',
        'Arjun’s replica safely ingests duplicate with zero state corruption',
      ],
    },
    {
      id: 'sc-04-change-back-stale',
      title: '4. Intervening Change-Back Invalidation',
      badge: 'Causal Invalidation',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description:
        'Meera acknowledges T1 handoff. Arjun changes T1 status to "blocked", and then changes it back to "todo". Even though current content equals the acknowledged state, intervening relevant history occurred, correctly marking the acknowledgment stale.',
      steps: [
        'Meera signs handoff acknowledgment on T1',
        'Arjun sets T1 to "blocked", then reverts to "todo"',
        'Sync exchanges heads',
        'Acknowledgment validity predicate detects intervening causal branch and flags Stale',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-300 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
            Interactive Testbed
          </span>
          <span className="text-xs text-stone-500 font-mono">
            4 Documented Demonstration Scenarios
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink mt-1.5">
          Guided CRDT Replay Scenarios
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
          Select any preset to load a pre-configured multi-step collaborative trace into the live two-replica laboratory.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((sc) => {
          const isActive = activeScenarioId === sc.id;

          return (
            <div
              key={sc.id}
              className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                isActive
                  ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white border-stone-300 hover:border-stone-400 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${sc.badgeColor}`}
                  >
                    {sc.badge}
                  </span>
                  {isActive && (
                    <span className="text-xs font-mono font-bold text-blue-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Scenario
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-stone-900 mt-2">{sc.title}</h3>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">{sc.description}</p>

                {/* Steps List */}
                <div className="mt-4 pt-3 border-t border-stone-200/80">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
                    Scenario Progression:
                  </span>
                  <ol className="list-decimal pl-4 space-y-1 text-xs text-stone-600 font-sans">
                    {sc.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-200 flex justify-end">
                <button
                  onClick={() => onLoadScenario(sc.id)}
                  className={`py-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Load Scenario in Lab
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

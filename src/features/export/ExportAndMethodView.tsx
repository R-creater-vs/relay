import React from 'react';
import * as Automerge from '@automerge/automerge';
import { Download, FileJson, Printer, BookOpen, Binary } from 'lucide-react';
import { RelayDoc, TransportMetrics } from '../../domain/types';

interface ExportAndMethodViewProps {
  docA: Automerge.Doc<RelayDoc>;
  docB: Automerge.Doc<RelayDoc>;
  metrics: TransportMetrics;
}

export const ExportAndMethodView: React.FC<ExportAndMethodViewProps> = ({
  docA,
  docB,
  metrics,
}) => {
  const headsA = Automerge.getHeads(docA);
  const headsB = Automerge.getHeads(docB);

  // Export Replay Bundle JSON
  const handleExportReplayJson = () => {
    const bundle = {
      formatVersion: '1.0.0',
      system: 'RELAY Causal Handoff CRDT Lab',
      exportedAt: new Date().toISOString(),
      headsA,
      headsB,
      materializedStateA: docA,
      materializedStateB: docB,
      transportMetrics: metrics,
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relay-replay-bundle-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Serialized Binary .automerge
  const handleExportBinary = () => {
    const bytesA = Automerge.save(docA);
    const blob = new Blob([bytesA as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `replica-a-canonical-${Date.now()}.automerge`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-300 p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-stone-100 text-stone-700 font-semibold border border-stone-200">
            Replication & Method
          </span>
          <span className="text-xs text-stone-500 font-mono">
            Full Binary State & Action Replay
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink mt-1.5">
          CRDT Artifact Export & Methodological Brief
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-3xl leading-relaxed">
          Export full serialized Automerge binary state chunks or the JSON replay package. All records adhere to the Automerge 3.5 column-oriented storage specification.
        </p>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3 border border-indigo-200">
              <FileJson className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">Replay Bundle JSON</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Export complete replica states, document heads, acknowledgment validity receipts, and transport metrics for offline audit.
            </p>
          </div>
          <button
            onClick={handleExportReplayJson}
            className="mt-4 w-full py-2 px-3 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download JSON Bundle
          </button>
        </div>

        <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
              <Binary className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">Automerge Binary (.automerge)</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Native compressed binary representation from <code>Automerge.save()</code>, ready to import into any Automerge 3.x runtime.
            </p>
          </div>
          <button
            onClick={handleExportBinary}
            className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download Binary
          </button>
        </div>

        <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center mb-3 border border-stone-300">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900">Printable Operations Memo</h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Two-page operations report showing converged task statuses, unresolved conflict receipts, and valid handoff acknowledgments.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="mt-4 w-full py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-stone-300"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Bibliography & Research Attribution */}
      <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-xs">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-purple-600" />
          Academic & Industry Bibliography
        </h3>

        <ul className="space-y-2 text-xs text-stone-600 leading-relaxed">
          <li>
            • <strong>Kleppmann, M., & Beresford, A. R. (2017):</strong>{' '}
            <em>A Conflict-Free Replicated JSON Datatype.</em> IEEE Transactions on Parallel and Distributed Systems.
          </li>
          <li>
            • <strong>Kleppmann, M., Wiggins, A., van Hardenberg, P., & McGranaghan, M. (2019):</strong>{' '}
            <em>Local-first software: You own your data, in spite of the cloud.</em> ACM Onward! 2019.
          </li>
          <li>
            • <strong>Ink & Switch (2020–2024):</strong>{' '}
            <em>Automerge 3.0: High-performance Conflict-Free Replicated JSON Datatypes with Rust and WebAssembly.</em>
          </li>
        </ul>
      </div>
    </div>
  );
};

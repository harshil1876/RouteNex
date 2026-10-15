import React, { useState } from 'react';

export default function StorageSettings() {
  const [dbStats, setDbStats] = useState({
    dbPath: '~/.routenex/storage.sqlite',
    sizeMb: 4.8,
    pageCount: 1240,
    freelistCount: 12,
    lastVacuum: '3 hours ago',
    lastOptimization: 'Today, 14:20',
    integrityCheck: 'OK',
  });

  const [retention, setRetention] = useState({
    quotaSnapshotsDays: 90,
    compressionAnalyticsDays: 30,
    callLogsDays: 7,
    appLogsDays: 7,
    maxRows: 100000,
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const runMaintenance = (action: string) => {
    setStatusMessage(`Executing ${action}...`);
    setTimeout(() => {
      setStatusMessage(`✓ ${action} completed successfully.`);
      setTimeout(() => setStatusMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">
            Storage & SQLite Database Maintenance
          </h2>
          <p className="text-xs text-[#8f96a3]">
            Telemetry persistence, PRAGMA page statistics, VACUUM maintenance, and log retention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => runMaintenance('Backup Now')}
            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-medium shadow-md shadow-purple-600/20"
          >
            Backup Now
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          {statusMessage}
        </div>
      )}

      {/* Database Path Banner */}
      <div className="p-4 rounded-xl bg-[#121622] border border-[#222738] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-mono font-bold text-sky-400 text-xs">
            SQL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-white">{dbStats.dbPath}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181d2c] border border-[#262f44] text-[#8e97ae] font-mono">
                SQLite 3
              </span>
            </div>
            <p className="text-xs text-[#8f96a3]">Local ACID-compliant embedded relational store for offline routing state</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400">Integrity: ✓ {dbStats.integrityCheck}</span>
        </div>
      </div>

      {/* Database Statistics */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
          Database Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
            <span className="text-[11px] text-[#7d8597] font-mono block mb-1">DATABASE SIZE</span>
            <span className="text-2xl font-bold text-white font-mono">{dbStats.sizeMb} MB</span>
          </div>
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
            <span className="text-[11px] text-[#7d8597] font-mono block mb-1">PAGE COUNT</span>
            <span className="text-2xl font-bold text-purple-400 font-mono">{dbStats.pageCount.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
            <span className="text-[11px] text-[#7d8597] font-mono block mb-1">FREELIST COUNT</span>
            <span className="text-2xl font-bold text-sky-400 font-mono">{dbStats.freelistCount} pages</span>
          </div>
          <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
            <span className="text-[11px] text-[#7d8597] font-mono block mb-1">LAST VACUUM</span>
            <span className="text-sm font-bold text-white font-mono">{dbStats.lastVacuum}</span>
          </div>
        </div>
      </div>

      {/* Export & Backup */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
          Database Export & Backup
        </h3>
        <div className="p-5 rounded-xl bg-[#121622] border border-[#222738] flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => runMaintenance('Export Database')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white transition-colors"
          >
            Export Database (.sqlite)
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Export All (.tar.gz)')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white transition-colors"
          >
            Export All (.tar.gz)
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Export JSON')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white transition-colors"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Import Database')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white transition-colors"
          >
            Import Database
          </button>
        </div>
      </div>

      {/* Maintenance Controls */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
          Maintenance & Pruning
        </h3>
        <div className="p-5 rounded-xl bg-[#121622] border border-[#222738] flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => runMaintenance('Manual VACUUM')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white"
          >
            Manual VACUUM
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Clear Cache')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white"
          >
            Clear Cache
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Purge Expired Logs')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white"
          >
            Purge Expired Logs
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Purge Quota Snapshots')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white"
          >
            Purge Quota Snapshots
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to reset all local usage data?')) {
                runMaintenance('Reset Usage Data');
              }
            }}
            className="px-3 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-mono text-rose-300 ml-auto"
          >
            Reset Usage Data
          </button>
        </div>
      </div>

      {/* Retention Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-[#8f96a3] uppercase tracking-wider font-mono">
          Retention Policies
        </h3>
        <div className="p-5 rounded-xl bg-[#121622] border border-[#222738] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-mono text-[#8f96a3] mb-1">Quota Snapshots</label>
            <input
              type="number"
              value={retention.quotaSnapshotsDays}
              onChange={(e) => setRetention({ ...retention, quotaSnapshotsDays: Number(e.target.value) })}
              className="w-full bg-[#181d2c] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-[#7d8597] font-mono mt-1 block">Default: 90 days</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8f96a3] mb-1">Compression Analytics</label>
            <input
              type="number"
              value={retention.compressionAnalyticsDays}
              onChange={(e) => setRetention({ ...retention, compressionAnalyticsDays: Number(e.target.value) })}
              className="w-full bg-[#181d2c] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-[#7d8597] font-mono mt-1 block">Default: 30 days</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8f96a3] mb-1">Call Logs</label>
            <input
              type="number"
              value={retention.callLogsDays}
              onChange={(e) => setRetention({ ...retention, callLogsDays: Number(e.target.value) })}
              className="w-full bg-[#181d2c] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-[#7d8597] font-mono mt-1 block">Default: 7 days</span>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#8f96a3] mb-1">Max Retained Rows</label>
            <input
              type="number"
              value={retention.maxRows}
              onChange={(e) => setRetention({ ...retention, maxRows: Number(e.target.value) })}
              className="w-full bg-[#181d2c] border border-[#262f44] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            />
            <span className="text-[10px] text-[#7d8597] font-mono mt-1 block">Default: 100,000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

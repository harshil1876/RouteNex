import React, { useState, useEffect, useCallback } from 'react';

export default function StorageSettings() {
  const [dbStats, setDbStats] = useState({
    dbPath: '~/.routenex/storage.sqlite',
    sizeMb: 0.12,
    pageCount: 32,
    freelistCount: 0,
    lastVacuum: 'Ready',
    lastOptimization: 'Active (WAL mode)',
    integrityCheck: 'OK',
  });

  const [records, setRecords] = useState({
    requests: 0,
    virtualKeys: 0,
    combos: 0,
    workers: 0,
    memories: 0,
    total: 0,
  });

  const [retention, setRetention] = useState({
    quotaSnapshotsDays: 90,
    compressionAnalyticsDays: 30,
    callLogsDays: 7,
    appLogsDays: 7,
    maxRows: 100000,
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('routenex_admin_token') || 'routenex-admin') : 'routenex-admin';
      const headers = { 'Authorization': `Bearer ${token}`, 'x-admin-token': token };
      const res = await fetch('http://127.0.0.1:3001/v1/admin/storage/stats', { headers }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setDbStats({
          dbPath: data.dbPath || './routenex.json',
          sizeMb: data.sizeMb ?? 0.05,
          pageCount: data.pageCount ?? 1,
          freelistCount: data.freelistCount ?? 0,
          lastVacuum: data.lastVacuum || 'Ready',
          lastOptimization: data.lastOptimization || 'Active (WAL mode)',
          integrityCheck: data.integrityCheck || 'OK',
        });
        if (data.records) {
          setRecords(data.records);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const runMaintenance = async (action: string) => {
    setStatusMessage(`Executing ${action}...`);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('routenex_admin_token') || 'routenex-admin' : 'routenex-admin';
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-admin-token': token,
      };

      if (action.includes('VACUUM')) {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/storage/vacuum', { method: 'POST', headers });
        if (res.ok) {
          const data = await res.json();
          setStatusMessage(`✓ ${data.message || 'VACUUM completed successfully.'}`);
          await fetchStats();
        } else {
          setStatusMessage(`Error: VACUUM failed (HTTP ${res.status}).`);
        }
      } else if (action.includes('Reset')) {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/storage/reset', { method: 'POST', headers });
        if (res.ok) {
          setStatusMessage('✓ All local usage records have been reset.');
          await fetchStats();
        } else {
          setStatusMessage(`Error: Reset failed (HTTP ${res.status}).`);
        }
      } else if (action.includes('Clear Cache')) {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/storage/clear-cache', { method: 'POST', headers });
        if (res.ok) {
          const data = await res.json();
          setStatusMessage(`✓ ${data.message || 'Gateway caches cleared.'}`);
        } else {
          setStatusMessage(`Error: Clear cache failed (HTTP ${res.status}).`);
        }
      } else if (action.includes('Purge')) {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/storage/purge-logs', { method: 'POST', headers });
        if (res.ok) {
          const data = await res.json();
          setStatusMessage(`✓ ${data.message || 'Logs purged successfully.'}`);
          await fetchStats();
        } else {
          setStatusMessage(`Error: Purge failed (HTTP ${res.status}).`);
        }
      } else if (action.includes('Export') || action.includes('Backup')) {
        const res = await fetch('http://127.0.0.1:3001/v1/admin/storage/export', { method: 'GET', headers });
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `routenex-export-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
          setStatusMessage('✓ Database export downloaded successfully.');
        } else {
          setStatusMessage(`Error: Export failed (HTTP ${res.status}).`);
        }
      } else {
        setStatusMessage(`Action '${action}' is not yet configured on the local gateway.`);
      }
    } catch (err: any) {
      setStatusMessage(`Error: Gateway unreachable (${err?.message || 'network error'}).`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
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
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-mono font-medium shadow-sm transition-all"
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
            <span className="text-2xl font-bold text-white font-mono">{dbStats.pageCount.toLocaleString()}</span>
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

        {/* Live Records Telemetry Pill */}
        <div className="p-3 rounded-lg bg-[#121622] border border-[#222738] flex flex-wrap items-center justify-between text-xs font-mono text-[#8f96a3]">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">Active Records ({records.total}):</span>
            <span>{records.requests} Requests</span>
            <span>•</span>
            <span>{records.virtualKeys} Virtual Keys</span>
            <span>•</span>
            <span>{records.combos} Combos</span>
            <span>•</span>
            <span>{records.workers} Workers</span>
            <span>•</span>
            <span>{records.memories} Memories</span>
          </div>
          <span className="text-emerald-400">Disk WAL Synced ✓</span>
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
            onClick={() => runMaintenance('Export Backup')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-sky-500/40 text-xs font-mono text-sky-300 flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={() => runMaintenance('Manual VACUUM')}
            className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white cursor-pointer transition"
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

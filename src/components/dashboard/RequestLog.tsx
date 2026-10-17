import React, { useState, useEffect, useMemo } from 'react';

export interface RequestItem {
  id: string;
  time: string;
  model: string;
  requestedModel: string;
  provider: string;
  cacheSource: 'UPSTREAM' | 'SEMANTIC_CACHE' | 'EXACT_CACHE';
  protocol: 'HTTP /v1' | 'MCP stdio' | 'A2A' | 'SSE';
  account: string;
  apiKeyMasked: string;
  combo: string;
  tokens: { prompt: number; completion: number; total: number };
  tps: number;
  latencyMs: number;
  costUsd: number;
  status: string;
  statusCode: number;
  isSuccess: boolean;
  correlationId?: string;
  conversationId?: string;
}

export default function RequestLog() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isRecording, setIsRecording] = useState(true);
  const [pipelineLogs, setPipelineLogs] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [correlationFilter, setCorrelationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  // 14 Toggleable Column Pills (matching Screenshot 597)
  const [columns, setColumns] = useState<Record<string, boolean>>({
    status: true,
    cacheSource: true,
    model: true,
    requested: true,
    provider: true,
    protocol: true,
    account: true,
    apiKey: true,
    combo: true,
    tokens: true,
    tps: true,
    duration: true,
    time: true,
    conversation: false,
  });

  const columnList = [
    { id: 'status', label: 'Status' },
    { id: 'cacheSource', label: 'Cache Source' },
    { id: 'model', label: 'Model' },
    { id: 'requested', label: 'Requested' },
    { id: 'provider', label: 'Provider' },
    { id: 'protocol', label: 'Request Protocol' },
    { id: 'account', label: 'Account' },
    { id: 'apiKey', label: 'API Key' },
    { id: 'combo', label: 'Combo' },
    { id: 'tokens', label: 'Tokens' },
    { id: 'tps', label: 'TPS' },
    { id: 'duration', label: 'Duration' },
    { id: 'time', label: 'Time' },
    { id: 'conversation', label: 'Conversation' },
  ];

  const toggleColumn = (colId: string) => {
    setColumns((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  // Fetch live requests from gateway database
  useEffect(() => {
    async function fetchLiveRequests() {
      try {
        const token = localStorage.getItem('routenex_admin_token') || 'rn-local-dev-default';
        const res = await fetch('http://127.0.0.1:3001/v1/admin/requests', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (Array.isArray(data.requests) && data.requests.length > 0) {
            setRequests(data.requests);
          }
        }
      } catch {
        // Gateway offline or no requests yet
      }
    }

    fetchLiveRequests();
    const interval = setInterval(fetchLiveRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        searchFilter === '' ||
        r.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.provider.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.id.toLowerCase().includes(searchFilter.toLowerCase());

      const matchCorrelation =
        correlationFilter === '' ||
        (r.correlationId && r.correlationId.toLowerCase().includes(correlationFilter.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SUCCESS' && r.isSuccess) ||
        (statusFilter === 'ERROR' && !r.isSuccess);

      return matchSearch && matchCorrelation && matchStatus;
    });
  }, [requests, searchFilter, correlationFilter, statusFilter]);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Header & Live Recording Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight font-sans">
            Request Logs & Execution Trace
          </h2>
          <p className="text-zinc-500 text-xs font-sans mt-0.5">
            Per-request token breakdown, latency profiling, and failover status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition ${
              isRecording
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span>{isRecording ? 'Live Recording' : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPipelineLogs(!pipelineLogs)}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition ${
              pipelineLogs
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200'
                : 'bg-[#111113] text-zinc-400 border-[#222226] hover:text-zinc-200'
            }`}
          >
            Pipeline Logs: {pipelineLogs ? 'Expanded' : 'Standard'}
          </button>
        </div>
      </div>

      {/* 14 Column Filter Pills (Screenshot 597) */}
      <div className="space-y-2">
        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
          Visible Columns ({Object.values(columns).filter(Boolean).length}/14):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {columnList.map((col) => {
            const active = columns[col.id];
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColumn(col.id)}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
                  active
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-[#111113] text-zinc-500 border-[#222226] hover:text-zinc-300'
                }`}
              >
                {col.label} {active ? '✓' : '+'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Correlation Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter by model, provider, or request ID..."
          className="bg-[#111113] border border-[#222226] rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <input
          type="text"
          value={correlationFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter by Correlation ID..."
          className="bg-[#111113] border border-[#222226] rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <div className="flex rounded border border-[#222226] bg-[#111113] p-0.5">
          {['ALL', 'SUCCESS', 'ERROR'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1 rounded text-[11px] transition ${
                statusFilter === st ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table or Empty State */}
      <div className="rounded-xl border border-[#222226] bg-[#111113] overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3 font-sans">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400 text-sm">
              📋
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">No requests recorded this week</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              RouteNex is listening on <code className="text-zinc-300 font-mono">http://127.0.0.1:3001/v1</code>.
              Send a completion request or run <code className="text-zinc-300 font-mono">routenex run claude</code> to see live execution telemetry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222226] bg-[#09090b] text-[10px] text-zinc-500 font-mono">
                  {columns.status && <th className="py-2.5 px-3 uppercase font-semibold">Status</th>}
                  {columns.cacheSource && <th className="py-2.5 px-3 uppercase font-semibold">Source</th>}
                  {columns.model && <th className="py-2.5 px-3 uppercase font-semibold">Model</th>}
                  {columns.requested && <th className="py-2.5 px-3 uppercase font-semibold">Requested</th>}
                  {columns.provider && <th className="py-2.5 px-3 uppercase font-semibold">Provider</th>}
                  {columns.protocol && <th className="py-2.5 px-3 uppercase font-semibold">Protocol</th>}
                  {columns.account && <th className="py-2.5 px-3 uppercase font-semibold">Account</th>}
                  {columns.apiKey && <th className="py-2.5 px-3 uppercase font-semibold">Key</th>}
                  {columns.combo && <th className="py-2.5 px-3 uppercase font-semibold">Combo</th>}
                  {columns.tokens && <th className="py-2.5 px-3 uppercase font-semibold text-right">Tokens</th>}
                  {columns.tps && <th className="py-2.5 px-3 uppercase font-semibold text-right">TPS</th>}
                  {columns.duration && <th className="py-2.5 px-3 uppercase font-semibold text-right">Duration</th>}
                  {columns.time && <th className="py-2.5 px-3 uppercase font-semibold text-right">Time</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222226]">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                  >
                    {columns.status && (
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.isSuccess
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/10 border border-red-500/30 text-red-400'
                          }`}
                        >
                          {r.statusCode}
                        </span>
                      </td>
                    )}
                    {columns.cacheSource && (
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {r.cacheSource}
                        </span>
                      </td>
                    )}
                    {columns.model && <td className="py-2.5 px-3 text-zinc-100 font-medium">{r.model}</td>}
                    {columns.requested && <td className="py-2.5 px-3 text-zinc-500">{r.requestedModel}</td>}
                    {columns.provider && <td className="py-2.5 px-3 text-zinc-400">{r.provider}</td>}
                    {columns.protocol && <td className="py-2.5 px-3 text-zinc-500">{r.protocol}</td>}
                    {columns.account && <td className="py-2.5 px-3 text-zinc-500">{r.account}</td>}
                    {columns.apiKey && <td className="py-2.5 px-3 text-zinc-500">{r.apiKeyMasked}</td>}
                    {columns.combo && <td className="py-2.5 px-3 text-zinc-300">{r.combo}</td>}
                    {columns.tokens && (
                      <td className="py-2.5 px-3 text-right text-zinc-400">
                        {r.tokens.total.toLocaleString()}
                      </td>
                    )}
                    {columns.tps && <td className="py-2.5 px-3 text-right text-emerald-400">{r.tps}</td>}
                    {columns.duration && <td className="py-2.5 px-3 text-right text-zinc-300">{r.latencyMs}ms</td>}
                    {columns.time && <td className="py-2.5 px-3 text-right text-zinc-500">{r.time}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Modal Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#111113] border border-[#222226] rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#222226]">
              <div>
                <span className="text-[10px] text-zinc-500 font-mono block">REQUEST INSPECTOR</span>
                <h3 className="text-sm font-semibold text-zinc-100 font-mono">{selectedRequest.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-zinc-500 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-[#09090b] border border-[#222226]">
                <span className="text-zinc-500 block text-[10px]">Model Used</span>
                <span className="text-zinc-100 font-semibold">{selectedRequest.model}</span>
              </div>
              <div className="p-3 rounded bg-[#09090b] border border-[#222226]">
                <span className="text-zinc-500 block text-[10px]">Provider</span>
                <span className="text-zinc-100 font-semibold">{selectedRequest.provider}</span>
              </div>
              <div className="p-3 rounded bg-[#09090b] border border-[#222226]">
                <span className="text-zinc-500 block text-[10px]">Latency</span>
                <span className="text-emerald-400 font-semibold">{selectedRequest.latencyMs}ms</span>
              </div>
              <div className="p-3 rounded bg-[#09090b] border border-[#222226]">
                <span className="text-zinc-500 block text-[10px]">Total Tokens</span>
                <span className="text-zinc-100 font-semibold">{selectedRequest.tokens.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-1.5 rounded bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';

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

export const initialRequests: RequestItem[] = [
  { id: 'req_01HP8A', time: '14:23:08', model: 'llama-3.3-70b-versatile', requestedModel: 'auto', provider: 'Groq', cacheSource: 'UPSTREAM', protocol: 'HTTP /v1', account: 'default', apiKeyMasked: 'rn_live_...9f2a', combo: 'combo/coding-power', latencyMs: 98, tps: 289, tokens: { prompt: 142, completion: 284, total: 426 }, costUsd: 0.00000, status: '200 OK', statusCode: 200, isSuccess: true, correlationId: 'corr-01824-a', conversationId: 'conv-dev-3' },
  { id: 'req_01HP8B', time: '14:22:51', model: 'gpt-4o-mini', requestedModel: 'auto', provider: 'OpenAI', cacheSource: 'SEMANTIC_CACHE', protocol: 'HTTP /v1', account: 'prod', apiKeyMasked: 'rn_live_...14b2', combo: 'default', latencyMs: 14, tps: 840, tokens: { prompt: 512, completion: 120, total: 632 }, costUsd: 0.00000, status: '200 OK', statusCode: 200, isSuccess: true, correlationId: 'corr-01823-b' },
  { id: 'req_01HP8C', time: '14:21:40', model: 'gemini-2.5-flash', requestedModel: 'gemini-2.5-flash', provider: 'Google Gemini', cacheSource: 'UPSTREAM', protocol: 'HTTP /v1', account: 'alex@dev', apiKeyMasked: 'rn_live_...9f2a', combo: 'combo/free-unlimited', latencyMs: 245, tps: 182, tokens: { prompt: 820, completion: 410, total: 1230 }, costUsd: 0.00000, status: '200 OK', statusCode: 200, isSuccess: true, correlationId: 'corr-01822-c' },
  { id: 'req_01HP8D', time: '14:20:15', model: 'claude-3-7-sonnet', requestedModel: 'claude-3-7-sonnet', provider: 'Anthropic', cacheSource: 'UPSTREAM', protocol: 'HTTP /v1', account: 'prod', apiKeyMasked: 'rn_live_...48ac', combo: 'direct', latencyMs: 410, tps: 64, tokens: { prompt: 310, completion: 180, total: 490 }, costUsd: 0.00412, status: '200 OK', statusCode: 200, isSuccess: true, correlationId: 'corr-01821-d' },
  { id: 'req_01HP8E', time: '14:19:02', model: 'llama-3.3-70b-versatile', requestedModel: 'auto', provider: 'Groq', cacheSource: 'UPSTREAM', protocol: 'HTTP /v1', account: 'default', apiKeyMasked: 'rn_live_...9f2a', combo: 'combo/free-unlimited', latencyMs: 510, tps: 0, tokens: { prompt: 950, completion: 0, total: 950 }, costUsd: 0.00000, status: '429 Rate Limit', statusCode: 429, isSuccess: false, correlationId: 'corr-01820-e' },
  { id: 'req_01HP8F', time: '14:19:03', model: 'cerebras/llama-3.3-70b', requestedModel: 'auto', provider: 'Cerebras (Fallback)', cacheSource: 'UPSTREAM', protocol: 'HTTP /v1', account: 'free-pool', apiKeyMasked: 'rn_live_...9f2a', combo: 'combo/free-unlimited', latencyMs: 140, tps: 340, tokens: { prompt: 950, completion: 210, total: 1160 }, costUsd: 0.00000, status: '200 OK (Failover)', statusCode: 200, isSuccess: true, correlationId: 'corr-01819-f' },
  { id: 'req_01HP8G', time: '14:17:44', model: 'llama-3.1-8b-instant', requestedModel: 'auto/fast', provider: 'Groq', cacheSource: 'UPSTREAM', protocol: 'MCP stdio', account: 'default', apiKeyMasked: 'rn_live_...9f2a', combo: 'auto/fast', latencyMs: 72, tps: 420, tokens: { prompt: 85, completion: 94, total: 179 }, costUsd: 0.00000, status: '200 OK', statusCode: 200, isSuccess: true, correlationId: 'corr-01818-g' },
];

export default function RequestLog() {
  const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
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

  const handleCleanHistory = () => {
    if (confirm('Clean local in-memory request history?')) {
      setRequests([]);
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(requests, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `routenex_request_logs_${Date.now()}.json`);
    dlAnchor.click();
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchText =
        r.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.provider.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.id.toLowerCase().includes(searchFilter.toLowerCase());

      const matchCorr = correlationFilter
        ? (r.correlationId || '').toLowerCase().includes(correlationFilter.toLowerCase())
        : true;

      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'SUCCESS'
          ? r.isSuccess
          : !r.isSuccess;

      return matchText && matchCorr && matchStatus;
    });
  }, [requests, searchFilter, correlationFilter, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Request Logs & Monitor</h2>
          <p className="text-xs text-[#8f96a3]">
            Realtime payload inspection, correlation tracking, and token throughput.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Recording Toggle */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
              isRecording
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
            {isRecording ? '• Recording' : 'Paused'}
          </button>

          {/* Pipeline Logs Toggle */}
          <button
            type="button"
            onClick={() => setPipelineLogs(!pipelineLogs)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors ${
              pipelineLogs
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-[#181d2c] border-[#262f44] text-[#8e97ae]'
            }`}
          >
            {pipelineLogs ? '• Pipeline logs on' : '• Pipeline logs off'}
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-white"
          >
            Export
          </button>

          <button
            type="button"
            onClick={handleCleanHistory}
            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-mono text-rose-300"
          >
            Clean history
          </button>
        </div>
      </div>

      {/* Filter Row: Search & Correlation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search by model, provider, or request ID..."
          className="bg-[#121622] border border-[#222738] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5a647d] font-mono focus:outline-none focus:border-purple-500"
        />

        <input
          type="text"
          value={correlationFilter}
          onChange={(e) => setCorrelationFilter(e.target.value)}
          placeholder="# Correlation ID (e.g. corr-01824)"
          className="bg-[#121622] border border-[#222738] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5a647d] font-mono focus:outline-none focus:border-purple-500"
        />

        <div className="flex rounded-lg bg-[#121622] border border-[#222738] p-0.5 text-xs font-mono">
          {['ALL', 'SUCCESS', 'ERROR'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`flex-1 py-1 rounded transition-colors ${
                statusFilter === s ? 'bg-purple-600 text-white font-semibold' : 'text-[#7d8597] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 14 Column Toggle Pills (Matching Screenshot 597) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#7d8597]">
          <span>TOGGLE COLUMNS (14 AVAILABLE):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {columnList.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => toggleColumn(col.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all ${
                columns[col.id]
                  ? 'bg-purple-600/15 border-purple-500/40 text-purple-300 font-medium'
                  : 'bg-[#121622] border-[#222738] text-[#636c80]'
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-[#222738] overflow-hidden bg-[#121622]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#161b2a] border-b border-[#222738] text-[#8e97ae]">
              <tr>
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
            <tbody className="divide-y divide-[#1b2234]">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedRequest(r)}
                  className="hover:bg-[#181d2c] transition-colors cursor-pointer"
                >
                  {columns.status && (
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.isSuccess
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {r.statusCode}
                      </span>
                    </td>
                  )}
                  {columns.cacheSource && (
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181d2c] text-[#8e97ae] border border-[#262f44]">
                        {r.cacheSource}
                      </span>
                    </td>
                  )}
                  {columns.model && <td className="py-2.5 px-3 text-white font-medium">{r.model}</td>}
                  {columns.requested && <td className="py-2.5 px-3 text-[#7d8597]">{r.requestedModel}</td>}
                  {columns.provider && <td className="py-2.5 px-3 text-[#a0a8be]">{r.provider}</td>}
                  {columns.protocol && <td className="py-2.5 px-3 text-[#7d8597]">{r.protocol}</td>}
                  {columns.account && <td className="py-2.5 px-3 text-[#7d8597]">{r.account}</td>}
                  {columns.apiKey && <td className="py-2.5 px-3 text-[#7d8597]">{r.apiKeyMasked}</td>}
                  {columns.combo && <td className="py-2.5 px-3 text-purple-300">{r.combo}</td>}
                  {columns.tokens && (
                    <td className="py-2.5 px-3 text-right text-[#a0a8be]">
                      {r.tokens.total.toLocaleString()}
                    </td>
                  )}
                  {columns.tps && <td className="py-2.5 px-3 text-right text-emerald-400">{r.tps}</td>}
                  {columns.duration && <td className="py-2.5 px-3 text-right text-sky-400">{r.latencyMs}ms</td>}
                  {columns.time && <td className="py-2.5 px-3 text-right text-[#7d8597]">{r.time}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#121622] border border-[#222738] rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#1f2638]">
              <div>
                <span className="text-[10px] text-[#7d8597] font-mono block">REQUEST INSPECTOR</span>
                <h3 className="text-sm font-semibold text-white font-mono">{selectedRequest.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#161b28] border border-[#232a3d]">
                <span className="text-[10px] text-[#7d8597] block">Status</span>
                <span className="text-white font-bold">{selectedRequest.status}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#161b28] border border-[#232a3d]">
                <span className="text-[10px] text-[#7d8597] block">Duration</span>
                <span className="text-white font-bold">{selectedRequest.latencyMs}ms</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#161b28] border border-[#232a3d]">
                <span className="text-[10px] text-[#7d8597] block">Tokens</span>
                <span className="text-white font-bold">{selectedRequest.tokens.total}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#161b28] border border-[#232a3d]">
                <span className="text-[10px] text-[#7d8597] block">Cost</span>
                <span className="text-emerald-400 font-bold">${selectedRequest.costUsd.toFixed(5)}</span>
              </div>
            </div>

            <pre className="p-3 rounded-lg bg-[#161b28] border border-[#232a3d] text-[11px] font-mono text-[#a0a8be] overflow-x-auto max-h-48">
              <code>{JSON.stringify(selectedRequest, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

interface ServiceItem {
  id: string;
  name: string;
  port: number;
  status: 'running' | 'stopped';
  description: string;
  autoStart: boolean;
  autoRestart: boolean;
  fallbackRouting: boolean;
}

export default function EmbeddedServices() {
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'cliproxyapi',
      name: 'CLIProxyAPI',
      port: 8317,
      status: 'stopped',
      description: 'Intercepts CLI AI tool requests, translating arbitrary commands into clean OpenAI-compatible endpoints.',
      autoStart: false,
      autoRestart: true,
      fallbackRouting: true,
    },
    {
      id: '9router',
      name: '9Router',
      port: 8318,
      status: 'stopped',
      description: 'Lightweight round-robin load balancer for upstream aggregator accounts and rate limit pooling.',
      autoStart: false,
      autoRestart: true,
      fallbackRouting: true,
    },
    {
      id: 'mux',
      name: 'Mux',
      port: 8319,
      status: 'stopped',
      description: 'Stream multiplexer and token-chunk deduplicator for high-concurrency coding agent clusters.',
      autoStart: false,
      autoRestart: false,
      fallbackRouting: false,
    },
    {
      id: 'bifrost',
      name: 'Bifrost',
      port: 8320,
      status: 'stopped',
      description: 'High-throughput local cache and embedding vector store proxy for agent semantic memory.',
      autoStart: true,
      autoRestart: true,
      fallbackRouting: true,
    },
    {
      id: 'dario',
      name: 'Dario',
      port: 8321,
      status: 'stopped',
      description: 'Background evaluator running continuous latency, accuracy, and ToS compliance benchmarks.',
      autoStart: false,
      autoRestart: false,
      fallbackRouting: false,
    },
  ]);

  const [activeServiceId, setActiveServiceId] = useState<string>('cliproxyapi');

  const activeService = services.find((s) => s.id === activeServiceId) || services[0];

  const toggleToggle = (field: 'autoStart' | 'autoRestart' | 'fallbackRouting') => {
    setServices((prev) =>
      prev.map((s) => (s.id === activeServiceId ? { ...s, [field]: !s[field] } : s))
    );
  };

  const toggleProcess = () => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === activeServiceId
          ? { ...s, status: s.status === 'running' ? 'stopped' : 'running' }
          : s
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">Embedded Proxy Services</h2>
          <p className="text-xs text-[#8f96a3]">Manage local helper processes, multiplexers, and protocol translators.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#8f96a3]">Active: 0 / 5</span>
        </div>
      </div>

      {/* Service Tabs */}
      <div className="flex border-b border-[#222738] overflow-x-auto gap-2">
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveServiceId(s.id)}
            className={`pb-2.5 px-3 text-xs font-mono font-medium transition-colors shrink-0 flex items-center gap-2 border-b-2 ${
              activeServiceId === s.id
                ? 'border-white text-white'
                : 'border-transparent text-[#7d8597] hover:text-white'
            }`}
          >
            <span>{s.name}</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                s.status === 'running' ? 'bg-emerald-400' : 'bg-neutral-600'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Active Service Card */}
      <div className="p-6 rounded-xl bg-[#121622] border border-[#222738] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1b2234]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-semibold text-white font-mono">{activeService.name}</h3>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  activeService.status === 'running'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
              >
                {activeService.status === 'running' ? '● Running · port ' + activeService.port : 'Stopped · port ' + activeService.port}
              </span>
            </div>
            <p className="text-xs text-[#8f96a3]">{activeService.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleProcess}
              className={`px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all shadow-md ${
                activeService.status === 'running'
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                  : 'bg-white hover:bg-zinc-200 text-black shadow-sm'
              }`}
            >
              {activeService.status === 'running' ? 'Stop Service' : 'Install & Start'}
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#161b2a] border border-[#232b3f] flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white block">Auto-Start</span>
              <span className="text-[11px] text-[#7d8597]">Launch with RouteNex</span>
            </div>
            <button
              type="button"
              onClick={() => toggleToggle('autoStart')}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                activeService.autoStart ? 'bg-white' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-transform ${
                  activeService.autoStart ? 'translate-x-5 bg-black' : 'translate-x-1 bg-white'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-lg bg-[#161b2a] border border-[#232b3f] flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white block">Auto-Restart</span>
              <span className="text-[11px] text-[#7d8597]">Restart on crash/exit</span>
            </div>
            <button
              type="button"
              onClick={() => toggleToggle('autoRestart')}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                activeService.autoRestart ? 'bg-white' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-transform ${
                  activeService.autoRestart ? 'translate-x-5 bg-black' : 'translate-x-1 bg-white'
                }`}
              />
            </button>
          </div>

          <div className="p-4 rounded-lg bg-[#161b2a] border border-[#232b3f] flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white block">Fallback Routing</span>
              <span className="text-[11px] text-[#7d8597]">Route traffic through fallback</span>
            </div>
            <button
              type="button"
              onClick={() => toggleToggle('fallbackRouting')}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                activeService.fallbackRouting ? 'bg-white' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-transform ${
                  activeService.fallbackRouting ? 'translate-x-5 bg-black' : 'translate-x-1 bg-white'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

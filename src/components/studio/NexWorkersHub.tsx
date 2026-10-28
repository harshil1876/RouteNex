import React, { useState, useEffect } from 'react';
import { RouteNexClient } from '../../utils/gateway-client';

export type WorkersViewTab = 'workers' | 'queue' | 'briefs' | 'skills';
export type InspectorTab = 'briefs' | 'config' | 'schedule';

interface NexWorkersHubProps {
  onNavigateTab?: (tab: string) => void;
}

export default function NexWorkersHub({ onNavigateTab }: NexWorkersHubProps) {
  const [client] = useState(() => RouteNexClient.getInstance());
  const [activeTab, setActiveTab] = useState<WorkersViewTab>('workers');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('briefs');

  const [workers, setWorkers] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    activeWorkers: 4,
    pendingApprovals: 0,
    totalTokensSaved: 14200,
    totalSpendTodayUsd: 0.16,
  });

  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('worker_pr_guardian');
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [briefContent, setBriefContent] = useState<string>('');
  const [briefTitle, setBriefTitle] = useState<string>('');
  const [isEditingBrief, setIsEditingBrief] = useState(false);

  const [filterQuery, setFilterQuery] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [dispatchMode, setDispatchMode] = useState<'interactive' | 'webhook' | 'dryrun'>('interactive');
  const [isDispatching, setIsDispatching] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // New Worker Modal
  const [showNewWorkerModal, setShowNewWorkerModal] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({
    name: '',
    slug: '',
    role: '',
    instructions: '',
    brainModel: 'auto:balanced',
    guardModel: 'auto:free',
    pulseModel: 'auto:floor',
    maxDailyUsd: 2.0,
  });

  const loadData = async () => {
    try {
      const data = await client.getWorkersOverview();
      setWorkers(data.workers || []);
      setRuns(data.runs || []);
      setBriefs(data.briefs || []);
      setSkills(data.skills || []);
      setSummary(data.summary || summary);

      if (!selectedWorkerId && data.workers?.length > 0) {
        setSelectedWorkerId(data.workers[0].id);
      }
    } catch {
      // Fallback state already handled in client
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeWorker = workers.find((w) => w.id === selectedWorkerId || w.slug === selectedWorkerId) || workers[0];

  useEffect(() => {
    if (briefs.length > 0) {
      const b = briefs.find((item) => item.workerId === activeWorker?.id) || briefs[0];
      if (b) {
        setSelectedBriefId(b.id);
        setBriefTitle(b.title);
        setBriefContent(b.contentMarkdown);
      }
    }
  }, [activeWorker, briefs]);

  const copyToClipboard = (text: string, slug: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    }
  };

  const handleDispatch = async (overridePrompt?: string, proposedTool?: any) => {
    const text = overridePrompt || promptInput;
    if (!text.trim() || !activeWorker) return;
    setIsDispatching(true);
    setActionFeedback(null);

    const isDryRun = dispatchMode === 'dryrun';
    const trigger = dispatchMode === 'webhook' ? 'webhook' : 'manual';

    const res = await client.dispatchWorkerTask(activeWorker.id, {
      prompt: text,
      triggerType: trigger,
      proposedToolCall: proposedTool,
      dryRun: isDryRun,
    });

    setIsDispatching(false);
    if (!overridePrompt) setPromptInput('');

    if (res.ok) {
      loadData();
      if (res.run?.status === 'awaiting_approval') {
        setActionFeedback('Action Shield paused: Human approval required.');
      } else {
        setActionFeedback(`Task completed. Saved ${res.run?.totalTokensSaved || 0} tokens.`);
      }
    } else {
      setActionFeedback(`Error: ${res.error || 'Execution failed'}`);
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleResolveApproval = async (runId: string, decision: 'approve' | 'deny', alwaysAllow = false) => {
    const res = await client.resolveWorkerApproval(runId, decision, alwaysAllow);
    if (res.ok) {
      loadData();
      setActionFeedback(decision === 'approve' ? 'Action approved and executed.' : 'Action denied.');
    } else {
      setActionFeedback(`Failed: ${res.error}`);
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleSaveBrief = async () => {
    if (!selectedBriefId) return;
    const res = await client.updateWorkerBrief(selectedBriefId, {
      title: briefTitle,
      contentMarkdown: briefContent,
    });
    if (res.ok) {
      setIsEditingBrief(false);
      loadData();
      setActionFeedback('Worker Brief saved with revision increment.');
    }
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleDistillSkill = async (runId: string) => {
    const res = await client.distillRunToSkill(runId);
    if (res.ok) {
      loadData();
      setActionFeedback(`Distilled into new NexSkill: ${res.skill?.name}`);
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleCreateWorker = async () => {
    if (!newWorkerForm.name.trim()) return;
    const res = await client.saveWorker({
      ...newWorkerForm,
      slug: newWorkerForm.slug || newWorkerForm.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    });
    if (res.ok) {
      setShowNewWorkerModal(false);
      setNewWorkerForm({
        name: '',
        slug: '',
        role: '',
        instructions: '',
        brainModel: 'auto:balanced',
        guardModel: 'auto:free',
        pulseModel: 'auto:floor',
        maxDailyUsd: 2.0,
      });
      loadData();
      if (res.worker) setSelectedWorkerId(res.worker.id);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const q = filterQuery.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.slug.toLowerCase().includes(q) || w.role.toLowerCase().includes(q);
  });

  const workerRuns = runs.filter((r) => r.workerId === activeWorker?.id || r.workerSlug === activeWorker?.slug);
  const pendingRuns = runs.filter((r) => r.status === 'awaiting_approval');

  // Vector SVG Icons for Specialist Workers
  const renderWorkerIcon = (slug: string) => {
    switch (slug) {
      case 'pr-guardian':
        return (
          <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        );
      case 'inbox-triage':
        return (
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        );
      case 'cost-watchdog':
        return (
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case 'release-architect':
        return (
          <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
            <path d="m14 9 3 3-3 3" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#09090b] border border-zinc-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* 1. TOP SEGMENTED SWITCHER & 4 LIVE KPI TELEMETRY PILLS */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800/80 bg-[#0c0c0e] px-4 py-2.5 gap-3 shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#141418] border border-zinc-800/80 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('workers')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'workers' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            Workers
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'queue' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Approval Queue
            {pendingRuns.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full animate-pulse">
                {pendingRuns.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('briefs')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'briefs' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Worker Briefs
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'skills' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" x2="20" y1="19" y2="19" />
            </svg>
            NexSkills Library
          </button>
        </div>

        {/* 4 Live Telemetry KPI Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400">Active Workers:</span>
            <span className="font-mono font-medium text-zinc-100">{summary.activeWorkers} Specialists</span>
          </div>

          <div
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-colors border ${
              pendingRuns.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Pending Approvals:</span>
            <span className="font-mono font-semibold">{pendingRuns.length} Paused</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-300">
            <svg className="w-3 h-3 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
            </svg>
            <span className="text-zinc-400">Optimizer Savings:</span>
            <span className="font-mono font-semibold text-sky-400">48.2% via LogPrune</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-300 font-mono">
            <span className="text-zinc-400">24h Spend:</span>
            <span className="text-zinc-200">${summary.totalSpendTodayUsd.toFixed(2)} / $5.00 Cap</span>
          </div>
        </div>
      </div>

      {/* Action Toast Feedback Banner */}
      {actionFeedback && (
        <div className="px-4 py-1.5 bg-sky-950/60 border-b border-sky-500/30 text-xs text-sky-300 flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-sky-400 hover:text-sky-200 font-mono text-xs">
            ✕
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      {activeTab === 'workers' && (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANE (w-80) — SPECIALIST WORKER ROSTER */}
          <div className="w-80 shrink-0 border-r border-zinc-800/80 bg-[#0c0c0e] flex flex-col">
            <div className="p-3 border-b border-zinc-800/80 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter workers..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-[#141418] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500/50"
                />
                <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" x2="16.65" y1="21" y2="16.65" />
                </svg>
              </div>

              <button
                onClick={() => setShowNewWorkerModal(true)}
                className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-medium rounded-lg text-xs flex items-center gap-1 shrink-0 transition-colors"
                title="Create a new autonomous specialist worker"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" x2="12" y1="5" y2="19" />
                  <line x1="5" x2="19" y1="12" y2="12" />
                </svg>
                New
              </button>
            </div>

            {/* Specialist Worker Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredWorkers.map((worker) => {
                const isSelected = worker.id === activeWorker?.id;
                const hasPending = runs.some((r) => r.workerId === worker.id && r.status === 'awaiting_approval');

                return (
                  <div
                    key={worker.id}
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#15151b] border-sky-500/40 shadow-sm'
                        : 'bg-[#101014] border-zinc-800/80 hover:border-zinc-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          {renderWorkerIcon(worker.slug)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                            {worker.name}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-400">
                            worker/{worker.slug}
                          </div>
                        </div>
                      </div>

                      {hasPending ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
                          Needs Approval
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400" />
                          Ready
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                      {worker.role}
                    </p>

                    {/* Tri-Model Mini Bar Footer */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="truncate max-w-[120px]">Brain: {worker.brainModel}</span>
                      <span>Cap: ${worker.budget?.maxDailyUsd?.toFixed(2) || '2.00'}/d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER PANE (flex-1) — LIVE EXECUTION STREAM & ACTION SHIELD CARDS */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
            {/* Active Worker Header Bar */}
            {activeWorker && (
              <div className="px-4 py-3 border-b border-zinc-800/80 bg-[#0c0c0e] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-100 truncate">{activeWorker.name}</h2>
                    <button
                      onClick={() => copyToClipboard(`worker/${activeWorker.slug}`, activeWorker.slug)}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      title="Copy model ID to call in Cursor, Claude Code, or OpenAI SDK"
                    >
                      <span>model: "worker/{activeWorker.slug}"</span>
                      {copiedSlug === activeWorker.slug ? (
                        <span className="text-[10px] text-emerald-400">✓</span>
                      ) : (
                        <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{activeWorker.role}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDispatch('Verify system integrity and audit recent changes')}
                    disabled={isDispatching}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Run Task Now
                  </button>

                  <button
                    onClick={() =>
                      handleDispatch(
                        'Post review feedback comment to PR #42 with status checks',
                        { name: 'github.post_review', args: { pr: 42, body: 'Security check: verified' } }
                      )
                    }
                    disabled={isDispatching}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    title="Simulate a write action to inspect Action Shield Human-in-the-Loop gating"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Simulate Write (Test Shield)
                  </button>
                </div>
              </div>
            )}

            {/* Execution Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {workerRuns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">No Executions Recorded Yet</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mt-1">
                      Assign a task below or click a quick prompt to test Pulse Triage, Token Optimizer, and Action Shield.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={() => handleDispatch('Audit PR #42 for OWASP vulnerabilities and secret leaks')}
                      className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg"
                    >
                      Audit PR #42 diff
                    </button>
                    <button
                      onClick={() => handleDispatch('Summarize unread GitHub webhooks and CI/CD alert spam')}
                      className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg"
                    >
                      Triage inbox webhooks
                    </button>
                    <button
                      onClick={() =>
                        handleDispatch('Merge pull request #101 into main', {
                          name: 'github.merge_pr',
                          args: { pr: 101, mergeMethod: 'squash' },
                        })
                      }
                      className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg"
                    >
                      Test Critical Merge Guard
                    </button>
                  </div>
                </div>
              ) : (
                workerRuns.map((run) => (
                  <div key={run.id} className="bg-[#121215] border border-zinc-800/80 rounded-xl p-4 space-y-3 shadow-sm">
                    {/* Run Header */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400">{run.id}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-400 capitalize">{run.triggerType} trigger</span>
                        {run.totalTokensSaved > 0 && (
                          <span className="text-sky-400 font-mono text-[11px] bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                            Saved {run.totalTokensSaved} tok
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {run.status === 'awaiting_approval' && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-md">
                            Awaiting Approval
                          </span>
                        )}
                        {run.status === 'completed' && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                            Completed
                          </span>
                        )}
                        {run.status === 'denied' && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25 rounded-md">
                            Denied by Operator
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-zinc-500">
                          {new Date(run.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    {/* Prompt Box */}
                    <div className="text-xs text-zinc-200 bg-[#09090b] p-2.5 rounded-lg border border-zinc-800 font-mono">
                      {run.prompt}
                    </div>

                    {/* Step-by-Step Chronological Execution Trace */}
                    <div className="space-y-2 pt-1">
                      {run.steps?.map((step: any, idx: number) => {
                        const isActionShield = step.phase === 'guard' && step.toolCall?.approvalStatus === 'pending';

                        if (isActionShield) {
                          return (
                            <div
                              key={step.id || idx}
                              className="bg-[#141418] border border-amber-500/40 rounded-xl p-4 space-y-3 mt-2 shadow-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                                      Action Shield: Approval Required
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-semibold">
                                        {step.toolCall.riskTier} action
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-zinc-400">
                                      Policy evaluated by <span className="font-mono text-zinc-300">auto:free</span> ({step.latencyMs || 24}ms)
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-amber-200/90 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
                                {step.detail}
                              </div>

                              {/* Monospace JSON Arguments Preview */}
                              <div>
                                <div className="text-[10px] font-mono text-zinc-400 mb-1 flex items-center justify-between">
                                  <span>Tool: <strong className="text-zinc-200">{step.toolCall.name}</strong></span>
                                  <span>Arguments (Scrubbed)</span>
                                </div>
                                <pre className="p-2 bg-[#09090b] border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto">
                                  {JSON.stringify(step.toolCall.args, null, 2)}
                                </pre>
                              </div>

                              {/* Approval Actions */}
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleResolveApproval(run.id, 'approve')}
                                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Approve & Execute
                                  </button>

                                  <button
                                    onClick={() => handleResolveApproval(run.id, 'deny')}
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs transition-colors"
                                  >
                                    Deny & Skip Step
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleResolveApproval(run.id, 'approve', true)}
                                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                                  title="Add tool to worker's auto-approved permissions"
                                >
                                  Always Allow This Tool
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={step.id || idx} className="flex items-start gap-2.5 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium text-zinc-300">{step.title}</span>
                              <p className="text-[11px] text-zinc-400">{step.detail}</p>
                            </div>
                            {step.modelUsed && (
                              <span className="font-mono text-[10px] text-zinc-500 shrink-0">{step.modelUsed}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Brief or Distill Link */}
                    {run.status === 'completed' && (
                      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Brief Generated: <strong className="text-zinc-200">{run.outputBriefId || 'Yes'}</strong></span>
                        <button
                          onClick={() => handleDistillSkill(run.id)}
                          className="text-sky-400 hover:text-sky-300 text-xs font-medium flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <polyline points="4 17 10 11 4 5" />
                            <line x1="12" x2="20" y1="19" y2="19" />
                          </svg>
                          Distill into NexSkill
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom Task Composer Bar */}
            <div className="p-3 border-t border-zinc-800/80 bg-[#0c0c0e]">
              <div className="flex items-center gap-2">
                <select
                  value={dispatchMode}
                  onChange={(e) => setDispatchMode(e.target.value as any)}
                  className="bg-[#141418] border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-sky-500/50 shrink-0 font-medium"
                >
                  <option value="interactive">Interactive Run</option>
                  <option value="webhook">Simulate Webhook</option>
                  <option value="dryrun">Dry-Run Policy Check</option>
                </select>

                <input
                  type="text"
                  placeholder={`Assign a task to ${activeWorker?.name || 'Worker'} or test a prompt...`}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
                  className="flex-1 bg-[#141418] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500/50"
                />

                <button
                  onClick={() => handleDispatch()}
                  disabled={isDispatching || !promptInput.trim()}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 font-medium rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5"
                >
                  {isDispatching ? (
                    <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" x2="11" y1="2" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                  Dispatch
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANE (w-80) — 3-TAB INSPECTOR */}
          <div className="w-80 shrink-0 border-l border-zinc-800/80 bg-[#0c0c0e] flex flex-col">
            <div className="flex border-b border-zinc-800/80 bg-[#101014]">
              <button
                onClick={() => setInspectorTab('briefs')}
                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                  inspectorTab === 'briefs'
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Briefs
              </button>
              <button
                onClick={() => setInspectorTab('config')}
                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                  inspectorTab === 'config'
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Tri-Model & Shield
              </button>
              <button
                onClick={() => setInspectorTab('schedule')}
                className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
                  inspectorTab === 'schedule'
                    ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Routines
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 text-xs">
              {/* Tab 1: Briefs */}
              {inspectorTab === 'briefs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs">Output Briefs (Spaces)</span>
                    {briefs.length > 0 && (
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {briefs.length} Saved
                      </span>
                    )}
                  </div>

                  {briefs.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      Run a task to generate a structured Markdown brief.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={briefTitle}
                          disabled={!isEditingBrief}
                          onChange={(e) => setBriefTitle(e.target.value)}
                          className="w-full bg-[#141418] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-semibold disabled:opacity-80"
                        />
                      </div>

                      <div className="relative">
                        <textarea
                          rows={14}
                          value={briefContent}
                          disabled={!isEditingBrief}
                          onChange={(e) => setBriefContent(e.target.value)}
                          className="w-full bg-[#141418] border border-zinc-800 rounded p-2 text-[11px] font-mono text-zinc-300 disabled:opacity-80 resize-none leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {isEditingBrief ? (
                          <button
                            onClick={handleSaveBrief}
                            className="px-3 py-1 bg-sky-500 text-zinc-950 font-medium rounded text-xs"
                          >
                            Save Revision
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditingBrief(true)}
                            className="px-2.5 py-1 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 rounded text-xs"
                          >
                            Edit Markdown
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const blob = new Blob([briefContent], { type: 'text/markdown' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${activeWorker?.slug || 'worker'}-brief.md`;
                            a.click();
                          }}
                          className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded text-xs flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" x2="12" y1="15" y2="3" />
                          </svg>
                          .md Export
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Tri-Model & Shield */}
              {inspectorTab === 'config' && activeWorker && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">Primary Brain Combo</label>
                    <select
                      value={activeWorker.brainModel}
                      onChange={(e) => {
                        activeWorker.brainModel = e.target.value;
                        client.saveWorker(activeWorker).then(loadData);
                      }}
                      className="w-full bg-[#141418] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 font-mono"
                    >
                      <option value="auto:balanced">auto:balanced (60% cost / 40% speed)</option>
                      <option value="combo/coding-power">combo/coding-power (DeepSeek ➔ Groq ➔ GPT-4o-mini)</option>
                      <option value="combo/free-unlimited">combo/free-unlimited (Groq ➔ Cerebras ➔ Pollinations)</option>
                      <option value="openai/gpt-4o">openai/gpt-4o</option>
                      <option value="anthropic/claude-3-7-sonnet">anthropic/claude-3-7-sonnet</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">Guard Model</label>
                      <input
                        type="text"
                        value={activeWorker.guardModel}
                        disabled
                        className="w-full bg-[#141418] border border-zinc-800 rounded p-1.5 text-xs text-zinc-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">Pulse Model</label>
                      <input
                        type="text"
                        value={activeWorker.pulseModel}
                        disabled
                        className="w-full bg-[#141418] border border-zinc-800 rounded p-1.5 text-xs text-zinc-300 font-mono"
                      />
                    </div>
                  </div>

                  {/* Token Optimizer Checkboxes */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">Token Optimization</label>
                    <div className="space-y-1.5 bg-[#141418] p-2.5 rounded-lg border border-zinc-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeWorker.tokenOptimization?.logPrune}
                          onChange={(e) => {
                            activeWorker.tokenOptimization.logPrune = e.target.checked;
                            client.saveWorker(activeWorker).then(loadData);
                          }}
                          className="accent-sky-500 rounded"
                        />
                        <span className="text-[11px] text-zinc-300">LogPrune (Compress stack traces & logs)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeWorker.tokenOptimization?.turnDedup}
                          onChange={(e) => {
                            activeWorker.tokenOptimization.turnDedup = e.target.checked;
                            client.saveWorker(activeWorker).then(loadData);
                          }}
                          className="accent-sky-500 rounded"
                        />
                        <span className="text-[11px] text-zinc-300">TurnDedup (Deduplicate repeated context)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeWorker.tokenOptimization?.lexiPack}
                          onChange={(e) => {
                            activeWorker.tokenOptimization.lexiPack = e.target.checked;
                            client.saveWorker(activeWorker).then(loadData);
                          }}
                          className="accent-sky-500 rounded"
                        />
                        <span className="text-[11px] text-zinc-300">LexiPack (Strip conversational filler)</span>
                      </label>
                    </div>
                  </div>

                  {/* Hard Budget Circuit Breakers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">Max Per Run ($)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={activeWorker.budget?.maxPerRunUsd}
                        onChange={(e) => {
                          activeWorker.budget.maxPerRunUsd = parseFloat(e.target.value) || 0.25;
                          client.saveWorker(activeWorker).then(loadData);
                        }}
                        className="w-full bg-[#141418] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 block mb-1">Max Daily Spend ($)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={activeWorker.budget?.maxDailyUsd}
                        onChange={(e) => {
                          activeWorker.budget.maxDailyUsd = parseFloat(e.target.value) || 2.0;
                          client.saveWorker(activeWorker).then(loadData);
                        }}
                        className="w-full bg-[#141418] border border-zinc-800 rounded p-1.5 text-xs text-zinc-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Safety Rules */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">Plain-English Safety Rules</label>
                    <div className="space-y-1 bg-[#141418] p-2 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 max-h-32 overflow-y-auto">
                      {activeWorker.safetyRules?.map((rule: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-zinc-300">
                          <span className="text-amber-400 shrink-0">•</span>
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tools Permission Matrix */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">Connected Tools & Policies</label>
                    <div className="space-y-1 bg-[#141418] p-2 rounded-lg border border-zinc-800 text-[11px]">
                      {activeWorker.tools?.map((tool: any) => (
                        <div key={tool.id} className="flex items-center justify-between py-1 border-b border-zinc-800/60 last:border-0">
                          <div>
                            <span className="font-mono text-zinc-200">{tool.name}</span>
                            <span className="ml-1.5 text-[9px] uppercase px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              {tool.riskTier}
                            </span>
                          </div>
                          <select
                            value={tool.permission}
                            onChange={(e) => {
                              tool.permission = e.target.value;
                              client.saveWorker(activeWorker).then(loadData);
                            }}
                            className="bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 rounded px-1.5 py-0.5"
                          >
                            <option value="auto">Auto-Run</option>
                            <option value="ask">Ask First</option>
                            <option value="deny">Blocked</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Routines & Webhooks */}
              {inspectorTab === 'schedule' && activeWorker && (
                <div className="space-y-4">
                  {/* Cron Routine */}
                  <div className="bg-[#141418] p-3 rounded-xl border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-200 text-xs">Scheduled Routine</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeWorker.schedule?.enabled}
                          onChange={(e) => {
                            if (!activeWorker.schedule) activeWorker.schedule = {};
                            activeWorker.schedule.enabled = e.target.checked;
                            client.saveWorker(activeWorker).then(loadData);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500" />
                      </label>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 bg-[#09090b] p-2 rounded border border-zinc-800">
                      Cron: {activeWorker.schedule?.cron || '0 9 * * 1-5'} ({activeWorker.schedule?.label || 'Weekdays'})
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Prompt: "{activeWorker.schedule?.prompt || 'Audit and run periodic routine'}"
                    </p>
                  </div>

                  {/* Missed Run Banner */}
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="font-medium text-rose-300 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" x2="12" y1="8" y2="12" />
                        <line x1="12" x2="12.01" y1="16" y2="16" />
                      </svg>
                      Missed While Asleep Guard
                    </div>
                    <p className="text-[11px] text-rose-300/80 leading-relaxed">
                      If the computer is asleep when a cron routine comes due, RouteNex logs the missed window and offers 1-click recovery.
                    </p>
                    <button
                      onClick={() => handleDispatch('Recover missed scheduled run')}
                      className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded text-[11px] font-medium"
                    >
                      Retry After Review Now
                    </button>
                  </div>

                  {/* Webhook & Virtual Model Snippet */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">Webhook Ingress URL</label>
                    <pre className="p-2 bg-[#141418] border border-zinc-800 rounded text-[10px] font-mono text-zinc-300 overflow-x-auto">
                      POST http://localhost:3001/v1/workers/{activeWorker.slug}/trigger
                    </pre>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 block mb-1">OpenAI SDK Virtual Model Snippet</label>
                    <pre className="p-2 bg-[#141418] border border-zinc-800 rounded text-[10px] font-mono text-sky-400 overflow-x-auto">
{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3001/v1",
    api_key="rn-local-dev-default"
)

response = client.chat.completions.create(
    model="worker/${activeWorker.slug}",
    messages=[{"role": "user", "content": "Run task"}]
)`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. APPROVAL QUEUE VIEW */}
      {activeTab === 'queue' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Action Shield Approval Queue</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mutating write and critical tool calls paused for human verification.
              </p>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {pendingRuns.length} Actions Paused
            </span>
          </div>

          {pendingRuns.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">All Worker Actions Clear</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                No tool calls currently require approval. You can trigger a write action from the Workers tab to test the Action Shield.
              </p>
            </div>
          ) : (
            pendingRuns.map((run) => {
              const pendingStep = run.steps.find((s: any) => s.toolCall?.approvalStatus === 'pending');
              const worker = workers.find((w) => w.id === run.workerId);

              return (
                <div key={run.id} className="bg-[#141418] border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                          {worker?.name || 'Worker'}
                          <span className="font-mono text-xs text-zinc-400">worker/{run.workerSlug}</span>
                        </div>
                        <div className="text-xs text-zinc-400">Run ID: <span className="font-mono">{run.id}</span></div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded uppercase">
                      {pendingStep?.toolCall?.riskTier || 'WRITE'} Action
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 bg-[#09090b] p-3 rounded-lg border border-zinc-800">
                    <span className="text-zinc-500 font-mono block mb-1">PROMPT:</span>
                    {run.prompt}
                  </div>

                  <div className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <span className="font-semibold block mb-0.5">Matched Safety Rule:</span>
                    {pendingStep?.detail || 'Write action requires operator confirmation.'}
                  </div>

                  {pendingStep?.toolCall && (
                    <div>
                      <div className="text-xs font-mono text-zinc-400 mb-1">
                        Tool: <strong className="text-zinc-100">{pendingStep.toolCall.name}</strong>
                      </div>
                      <pre className="p-3 bg-[#09090b] border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto">
                        {JSON.stringify(pendingStep.toolCall.args, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveApproval(run.id, 'approve')}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-medium rounded-lg text-xs transition-colors"
                      >
                        Approve & Execute
                      </button>
                      <button
                        onClick={() => handleResolveApproval(run.id, 'deny')}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs transition-colors"
                      >
                        Deny & Skip Step
                      </button>
                    </div>

                    <button
                      onClick={() => handleResolveApproval(run.id, 'approve', true)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                    >
                      Always Allow This Tool for Worker
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. WORKER BRIEFS VIEW */}
      {activeTab === 'briefs' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Worker Briefs (Spaces)</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Structured Markdown reports and artifacts compiled by autonomous workers.
              </p>
            </div>
            <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              {briefs.length} Total Briefs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {briefs.map((brief) => (
              <div
                key={brief.id}
                className="bg-[#121215] border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
                    <span>{brief.workerName}</span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-[10px]">
                      v{brief.revision || 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1">{brief.title}</h3>
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed font-mono">
                    {brief.contentMarkdown.slice(0, 180)}...
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">
                    {new Date(brief.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab('workers');
                      setInspectorTab('briefs');
                      setSelectedWorkerId(brief.workerId);
                      setSelectedBriefId(brief.id);
                      setBriefTitle(brief.title);
                      setBriefContent(brief.contentMarkdown);
                    }}
                    className="text-sky-400 hover:text-sky-300 font-medium"
                  >
                    Open in Inspector ➔
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. NEXSKILLS LIBRARY VIEW */}
      {activeTab === 'skills' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">NexSkills & Agent Capabilities Library</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Reusable instructions and tool sequences. Distill skills from successful runs or bind them to workers.
              </p>
            </div>
            <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
              {skills.length} Available Skills
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div key={skill.id} className="bg-[#121215] border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100">{skill.name}</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {skill.source || 'builtin'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{skill.description}</p>

                {skill.tools && skill.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {skill.tools.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-mono text-[10px] text-zinc-300">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">{skill.slug}</span>
                  <button
                    onClick={() => {
                      if (activeWorker) {
                        if (!activeWorker.boundSkillIds) activeWorker.boundSkillIds = [];
                        if (!activeWorker.boundSkillIds.includes(skill.id)) {
                          activeWorker.boundSkillIds.push(skill.id);
                          client.saveWorker(activeWorker).then(() => {
                            setActionFeedback(`Bound ${skill.name} to ${activeWorker.name}`);
                            loadData();
                          });
                        } else {
                          setActionFeedback(`Already bound to ${activeWorker.name}`);
                        }
                      }
                    }}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-colors"
                  >
                    Bind to {activeWorker?.name || 'Worker'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE WORKER MODAL */}
      {showNewWorkerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100">Create Specialist Worker</h3>
              <button onClick={() => setShowNewWorkerModal(false)} className="text-zinc-400 hover:text-zinc-200">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Worker Name</label>
                <input
                  type="text"
                  placeholder="e.g. Documentation Architect"
                  value={newWorkerForm.name}
                  onChange={(e) => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Routable Slug (Virtual Model: worker/&lt;slug&gt;)</label>
                <input
                  type="text"
                  placeholder="e.g. doc-architect"
                  value={newWorkerForm.slug}
                  onChange={(e) => setNewWorkerForm({ ...newWorkerForm, slug: e.target.value })}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Role Summary</label>
                <input
                  type="text"
                  placeholder="e.g. Compiles API specs and updates changelogs automatically"
                  value={newWorkerForm.role}
                  onChange={(e) => setNewWorkerForm({ ...newWorkerForm, role: e.target.value })}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Instructions / System Directive</label>
                <textarea
                  rows={3}
                  placeholder="Define the autonomous specialist's goal and boundaries..."
                  value={newWorkerForm.instructions}
                  onChange={(e) => setNewWorkerForm({ ...newWorkerForm, instructions: e.target.value })}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 resize-none focus:outline-none focus:border-sky-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Primary Brain Model / Combo</label>
                <select
                  value={newWorkerForm.brainModel}
                  onChange={(e) => setNewWorkerForm({ ...newWorkerForm, brainModel: e.target.value })}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 font-mono"
                >
                  <option value="auto:balanced">auto:balanced</option>
                  <option value="combo/coding-power">combo/coding-power</option>
                  <option value="combo/free-unlimited">combo/free-unlimited</option>
                  <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowNewWorkerModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorker}
                disabled={!newWorkerForm.name.trim()}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-zinc-950 font-medium rounded-lg text-xs transition-colors"
              >
                Create Worker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import type { ActiveTab } from './Sidebar';

interface CloudEditionShowcaseProps {
  activeTab?: ActiveTab;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Auditor';
  status: 'Active' | 'Invited';
}

interface BudgetEntry {
  workspace: string;
  monthlyCapUsd: number;
  currentSpendUsd: number;
  hardStop: boolean;
}

export default function CloudEditionShowcase({ activeTab = 'overview' }: CloudEditionShowcaseProps) {
  // Waitlist form state
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [volume, setVolume] = useState('1M - 10M tokens/mo');
  const [submitted, setSubmitted] = useState(false);

  // Interactive Team Members state
  const [members, setMembers] = useState<TeamMember[]>([
    { id: '1', name: 'Harshil (You)', email: 'harshil@routenex.com', role: 'Owner', status: 'Active' },
    { id: '2', name: 'Elena Rostova', email: 'elena@enterprise.internal', role: 'Admin', status: 'Active' },
    { id: '3', name: 'Marcus Vance', email: 'marcus@enterprise.internal', role: 'Developer', status: 'Active' },
    { id: '4', name: 'Audit Compliance Bot', email: 'auditor@enterprise.internal', role: 'Auditor', status: 'Active' },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Developer' | 'Admin' | 'Auditor'>('Developer');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Interactive Budgets state
  const [budgets, setBudgets] = useState<BudgetEntry[]>([
    { workspace: 'Production Gateway (api.routenex.com)', monthlyCapUsd: 500, currentSpendUsd: 142.60, hardStop: true },
    { workspace: 'Staging & QA Cluster', monthlyCapUsd: 100, currentSpendUsd: 28.40, hardStop: true },
    { workspace: 'Developer Sandbox Keys', monthlyCapUsd: 50, currentSpendUsd: 43.10, hardStop: false },
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setMembers([
      ...members,
      {
        id: String(Date.now()),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'Invited',
      },
    ]);
    setInviteEmail('');
    setInviteSuccess(true);
    setTimeout(() => setInviteSuccess(false), 3000);
  };

  const handleSubmitWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  // 1. Team & RBAC View
  if (activeTab === 'cloud-team') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-medium">RouteNex Cloud SaaS</span>
            <h2 className="text-xl font-semibold text-ink tracking-tight mt-0.5">Team Workspaces & RBAC</h2>
            <p className="text-xs text-mute mt-1">Manage organization members, role permissions, and workspace scoping.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 font-mono text-xs">
            <span>Org:</span>
            <strong className="text-ink">Acme AI Labs</strong>
          </span>
        </div>

        {/* Invite Form */}
        <div className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-ink">Invite New Teammate</h3>
          <p className="text-xs text-mute mt-0.5 mb-3">Send an invitation to join this organization with scoped access.</p>

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className="flex-1 rounded-md border border-hairline bg-canvas px-3 py-1.5 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="rounded-md border border-hairline bg-canvas px-3 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="Developer">Developer (Read/Execute)</option>
              <option value="Admin">Admin (Manage Keys & Limits)</option>
              <option value="Auditor">Auditor (View-Only Logs)</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-ink px-4 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition shrink-0"
            >
              Send Invite
            </button>
          </form>

          {inviteSuccess && (
            <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-2">
              ✓ Invitation dispatched to cloud user directory!
            </p>
          )}
        </div>

        {/* Members Table */}
        <div className="rounded-lg border border-hairline bg-elevated shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-hairline bg-canvas flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-ink">Organization Members ({members.length})</span>
            <span className="text-[11px] font-mono text-mute">Enterprise RBAC</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-canvas border-b border-hairline text-mute">
                <tr>
                  <th className="py-2.5 px-4 font-medium">User</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-canvas transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-ink">{m.name}</div>
                      <div className="text-[11px] text-mute">{m.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        m.role === 'Owner'
                          ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                          : m.role === 'Admin'
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-body border border-hairline'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.role !== 'Owner' && (
                        <button
                          type="button"
                          onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                          className="text-red-500 hover:text-red-700 text-xs transition"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. Spend Budgets & Hard Caps View
  if (activeTab === 'cloud-budgets') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-medium">RouteNex Cloud SaaS</span>
            <h2 className="text-xl font-semibold text-ink tracking-tight mt-0.5">Spend Budgets & Caps</h2>
            <p className="text-xs text-mute mt-1">Configure hard spending limits and runaway-inference circuit breakers across workspaces.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 py-1 font-mono text-xs">
            <span>Total Month Spend:</span>
            <strong className="text-ink">$214.10 / $650</strong>
          </span>
        </div>

        {/* Budget Cards */}
        <div className="space-y-4">
          {budgets.map((b, idx) => {
            const pct = Math.min(100, Math.round((b.currentSpendUsd / b.monthlyCapUsd) * 100));
            const isNearCap = pct >= 80;
            return (
              <div key={b.workspace} className="rounded-lg border border-hairline bg-elevated p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{b.workspace}</h3>
                    <span className="text-[11px] font-mono text-mute">
                      {b.hardStop ? 'Hard Cap (Requests block at 100%)' : 'Soft Alert (Webhook notification only)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold text-ink">
                      ${b.currentSpendUsd.toFixed(2)}
                    </span>
                    <span className="font-mono text-xs text-mute"> / ${b.monthlyCapUsd.toFixed(2)} ({pct}%)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-hairline rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isNearCap ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs font-mono text-mute">
                  <span>Threshold Alerts: 75%, 90%, 100%</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newCap = prompt(`Update monthly budget cap for ${b.workspace}:`, String(b.monthlyCapUsd));
                      if (newCap && !isNaN(Number(newCap))) {
                        const updated = [...budgets];
                        updated[idx].monthlyCapUsd = Number(newCap);
                        setBudgets(updated);
                      }
                    }}
                    className="text-link hover:underline"
                  >
                    Edit Cap
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Default Cloud Overview
  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="rounded-xl border border-hairline bg-gradient-to-br from-elevated via-canvas to-elevated p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-xs font-medium text-sky-600 dark:text-sky-400 mb-3">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
              RouteNex Cloud (Hosted Managed Gateway)
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              Zero Server Maintenance.<br />
              Enterprise Teams & Global Edge.
            </h2>
            <p className="mt-3 text-sm text-body leading-relaxed">
              RouteNex Cloud is our fully managed cloud service. While RouteNex Open Source gives you total self-hosted control, RouteNex Cloud provides hosted multi-region gateways, team workspaces, centralized spend limits, and guaranteed uptime.
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0">
            <a
              href="#waitlist-form"
              className="inline-flex w-full md:w-auto items-center justify-center rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition shadow-sm"
            >
              Request Cloud Access →
            </a>
          </div>
        </div>
      </div>

      {/* Cloud Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-hairline bg-elevated p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas border border-hairline mb-4">
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3 className="font-semibold text-ink text-base">Hosted Global Edge</h3>
          <p className="mt-2 text-xs text-mute leading-relaxed">
            Requests route automatically through our low-latency edge nodes deployed in North America, Europe, and Asia-Pacific (<code className="font-mono">https://api.routenex.com</code>).
          </p>
          <div className="mt-4 pt-3 border-t border-hairline font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            ✓ 99.9% SLA & DDoS Protected
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-elevated p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas border border-hairline mb-4">
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className="font-semibold text-ink text-base">Team Workspaces & RBAC</h3>
          <p className="mt-2 text-xs text-mute leading-relaxed">
            Invite engineers and departments into dedicated organizations. Assign granular roles (Owner, Admin, Developer) with scoped provider access.
          </p>
          <div className="mt-4 pt-3 border-t border-hairline font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            ✓ Single Sign-On (SAML / Okta)
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-elevated p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-canvas border border-hairline mb-4">
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3 className="font-semibold text-ink text-base">Organization Budget Caps</h3>
          <p className="mt-2 text-xs text-mute leading-relaxed">
            Prevent runaway bills. Define strict monthly quotas per application key (e.g. $50/mo limit) with webhook alerts and soft thresholds.
          </p>
          <div className="mt-4 pt-3 border-t border-hairline font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            ✓ Unified Monthly Invoice
          </div>
        </div>
      </div>

      {/* Cloud Waitlist Request Form */}
      <div id="waitlist-form" className="rounded-lg border border-hairline bg-elevated p-6 sm:p-8 shadow-xs max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-ink text-center">Join the RouteNex Cloud Early Access</h3>
        <p className="mt-1 text-xs text-mute text-center">
          We are rolling out hosted clusters in batches. Sign up below for priority access and initial cloud credits.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
            <span className="text-2xl">🎉</span>
            <h4 className="mt-2 font-semibold text-ink text-base">You're on the Cloud Access List!</h4>
            <p className="mt-1 text-xs text-mute">
              We'll notify <strong className="text-ink">{email}</strong> as soon as your hosted edge workspace is ready to deploy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitWaitlist} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-mono text-mute mb-1">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-mute mb-1">Company / Team</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2 text-xs font-mono text-ink placeholder:text-mute focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-mute mb-1">Estimated Monthly Volume</label>
                <select
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full rounded-md border border-hairline bg-canvas px-3.5 py-2 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                >
                  <option value="< 1M tokens/mo">&lt; 1M tokens / month</option>
                  <option value="1M - 10M tokens/mo">1M - 10M tokens / month</option>
                  <option value="10M - 50M tokens/mo">10M - 50M tokens / month</option>
                  <option value="50M+ tokens/mo">50M+ tokens / month (Enterprise)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-ink px-6 py-2.5 text-xs font-medium text-white dark:bg-white dark:text-black hover:opacity-90 transition mt-2"
            >
              Request Access
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

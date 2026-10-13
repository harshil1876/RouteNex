import React, { useState } from 'react';

export default function CloudEditionShowcase() {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [volume, setVolume] = useState('1M - 10M tokens/mo');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

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
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
            <svg className="h-5 w-5 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

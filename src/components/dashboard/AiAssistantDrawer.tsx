import React, { useState } from 'react';

export default function AiAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your local RouteNex Assistant. Ask me how to route requests, configure free tiers, diagnose latency, or optimize prompt compression.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      // Query local gateway mock or assistant completion
      const res = await fetch('http://127.0.0.1:3001/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('routenex_admin_token') || 'rn-local-dev-default'}`,
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [
            { role: 'system', content: 'You are the embedded AI assistant for RouteNex. Keep answers concise, accurate, and developer-focused.' },
            ...messages,
            { role: 'user', content: userText },
          ],
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'RouteNex routed your query through the optimal model.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        // Helpful fallback assistant responses for offline/demo mode
        let reply = "Here's how RouteNex handles that: Set your base URL to http://127.0.0.1:3001/v1 and use model 'auto' for deterministic cost/latency routing.";
        if (userText.toLowerCase().includes('free')) {
          reply = "RouteNex includes ~1.62B tokens/month across Pollinations (zero-key), Mistral (1B/mo), Cerebras (1M/day), and Groq. Use combo/free-unlimited to auto-balance across them.";
        } else if (userText.toLowerCase().includes('mcp')) {
          reply = "The built-in MCP server runs on http://127.0.0.1:3001/v1/mcp or stdio with 'routenex --mcp'. It exposes list_models, explain_route, get_free_tier_quotas, test_provider_health, and upsert_combo.";
        } else if (userText.toLowerCase().includes('compression')) {
          reply = "The Caveman engine and 10 language packs prune redundant tokens by 30-55% while preserving semantic clarity with Auto-Clarity Bypass.";
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button on Right Edge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 p-2.5 rounded-l-lg border-l border-t border-b border-zinc-700 shadow-xl flex items-center gap-1.5 transition-all group font-mono"
        title="Open RouteNex AI Assistant"
      >
        <span className="text-xs text-emerald-400">⚡</span>
        <span className="text-[11px] font-medium tracking-tight pr-1 hidden group-hover:inline transition-all text-zinc-200">
          Assistant
        </span>
      </button>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b] border-l border-[#222226] shadow-2xl flex flex-col font-mono">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[#222226] flex items-center justify-between bg-[#111113]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-200 font-bold">
                RN
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-100 tracking-tight">RouteNex Assistant</h3>
                <span className="text-[10px] text-emerald-400">● Online · Port 3001</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-sans">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-zinc-800 border border-zinc-700 text-zinc-100 ml-6'
                    : 'bg-[#111113] border border-[#222226] text-zinc-300 mr-6'
                }`}
              >
                <div className="text-[10px] font-mono text-zinc-500 mb-1">
                  {m.role === 'user' ? 'YOU' : 'ROUTENEX AI'}
                </div>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="p-3 rounded-lg bg-[#111113] border border-[#222226] text-zinc-500 text-xs font-mono animate-pulse">
                Consulting routing engine...
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#222226] bg-[#111113] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask RouteNex assistant..."
              className="flex-1 bg-[#09090b] border border-[#222226] rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded bg-zinc-100 text-zinc-950 font-medium text-xs hover:bg-white disabled:opacity-50 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

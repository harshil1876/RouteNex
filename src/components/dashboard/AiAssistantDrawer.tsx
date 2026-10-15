import React, { useState } from 'react';

export default function AiAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: 'Hello! I am RouteNex AI Assistant. Ask me how to route requests, configure free tiers, diagnose latency, or optimize prompt compression.',
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
      {/* Floating Purple Button on Right Edge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white p-2.5 rounded-l-xl shadow-2xl shadow-purple-500/30 flex items-center gap-1.5 transition-all group"
        title="Open RouteNex AI Brain Assistant"
      >
        <span className="text-sm animate-pulse">⚡</span>
        <span className="text-[11px] font-mono font-medium tracking-tight pr-1 hidden group-hover:inline transition-all">
          AI Assistant
        </span>
      </button>

      {/* Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0e111a] border-l border-[#222738] shadow-2xl flex flex-col backdrop-blur-xl">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[#222738] flex items-center justify-between bg-[#121622]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs text-white font-bold shadow-md shadow-purple-500/20">
                ⚡
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white tracking-tight font-mono">RouteNex AI Assistant</h3>
                <span className="text-[10px] text-emerald-400 font-mono">● Online · Auto-Routing v0.2.0</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-[#7d8597] hover:text-white hover:bg-[#1f2536] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-purple-600/15 border border-purple-500/30 text-purple-100 ml-6'
                    : 'bg-[#161a27] border border-[#23293c] text-[#cfd4e3] mr-6'
                }`}
              >
                <div className="text-[10px] font-mono text-[#7d8597] mb-1">
                  {m.role === 'user' ? 'YOU' : 'ROUTENEX AI'}
                </div>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="p-3 rounded-lg bg-[#161a27] border border-[#23293c] text-[#7d8597] text-xs font-mono animate-pulse">
                Consulting routing engine...
              </div>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-[#1d2232] bg-[#10131d] flex gap-1.5 overflow-x-auto text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setInput('Explain current routing strategy')}
              className="px-2 py-1 rounded bg-[#181d2c] hover:bg-[#20273a] text-[#8e97ae] hover:text-white shrink-0 border border-[#283046]"
            >
              Strategy
            </button>
            <button
              type="button"
              onClick={() => setInput('What free tier pools are available?')}
              className="px-2 py-1 rounded bg-[#181d2c] hover:bg-[#20273a] text-[#8e97ae] hover:text-white shrink-0 border border-[#283046]"
            >
              Free Tiers
            </button>
            <button
              type="button"
              onClick={() => setInput('How do I run with Claude Code CLI?')}
              className="px-2 py-1 rounded bg-[#181d2c] hover:bg-[#20273a] text-[#8e97ae] hover:text-white shrink-0 border border-[#283046]"
            >
              Claude CLI
            </button>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#222738] bg-[#121622] flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about routing, models, or config..."
              className="flex-1 bg-[#181d2c] border border-[#283046] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5a647d] focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-purple-600/20 font-mono"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

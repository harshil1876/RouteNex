import React, { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AiAssistantDrawer({ isOpen = false, onClose }: AiAssistantDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
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
      const res = await fetch('http://127.0.0.1:3001/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('routenex_admin_token') || 'rn-local-dev-default') : 'rn-local-dev-default'}`,
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
        const reply = data.choices?.[0]?.message?.content || 'No response returned from model.';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        let reply = "RouteNex gateway is operating in local deterministic mode. You can inspect configured providers, routing topology, or test pulses in RouteNex Studio.";
        if (userText.toLowerCase().includes('combo')) {
          reply = "Combos allow automatic fallbacks across providers. For example: fast-text routes to groq/llama-3.3-70b-versatile and falls back to openai/gpt-4o-mini on 429 errors.";
        } else if (userText.toLowerCase().includes('mcp')) {
          reply = "The built-in MCP server runs on http://127.0.0.1:3001/v1/mcp or stdio with 'routenex --mcp'. It exposes list_models, explain_route, get_free_tier_quotas, test_provider_health, and upsert_combo.";
        } else if (userText.toLowerCase().includes('compression')) {
          reply = "The LexiPack engine and 10 language packs prune redundant tokens by 30-55% while preserving semantic clarity with Auto-Clarity Bypass.";
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#09090b] border-l border-[#222226] shadow-2xl flex flex-col font-sans">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#222226] flex items-center justify-between bg-[#111113]">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="RouteNex" width="24" height="24" className="h-6 w-6 rounded-md object-contain" />
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 tracking-tight font-sans">RouteNex Assistant</h3>
            <span className="text-[10px] text-sky-400">● Online · Port 3001</span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        )}
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
            <div className="text-[10px] font-sans text-zinc-500 mb-1">
              {m.role === 'user' ? 'YOU' : 'ROUTENEX AI'}
            </div>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="p-3 rounded-lg bg-[#111113] border border-[#222226] text-zinc-500 text-xs font-sans animate-pulse">
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
          className="flex-1 bg-[#09090b] border border-[#222226] rounded px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-3 py-2 rounded bg-sky-500 hover:bg-sky-400 !text-zinc-950 font-semibold text-xs disabled:opacity-50 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}

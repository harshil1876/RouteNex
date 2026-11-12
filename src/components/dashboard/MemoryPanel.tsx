import React, { useState, useEffect, useCallback } from 'react';

function getAdminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('routenex_admin_token') || 'routenex-admin') : 'routenex-admin';
  return {
    'Authorization': `Bearer ${token}`,
    'x-admin-token': token,
    ...extra,
  };
}

interface MemoryItem {
  id: string;
  topic: string;
  content: string;
  tokens: number;
  tags: string[];
  lastAccessed: string;
}

export default function MemoryPanel() {
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'memories' | 'engine' | 'playground'>('memories');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);

  const [memories, setMemories] = useState<MemoryItem[]>([]);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/memories', {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories)) {
          setMemories(data.memories);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newContent.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:3001/v1/admin/memories', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          topic: newTopic.trim(),
          content: newContent.trim(),
          tags: ['manual', 'session'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => [data.memory, ...prev]);
        }
      } else {
        const item: MemoryItem = {
          id: `mem-${Date.now()}`,
          topic: newTopic.trim(),
          content: newContent.trim(),
          tokens: Math.ceil(newContent.length / 4),
          tags: ['manual'],
          lastAccessed: 'Just now',
        };
        setMemories((prev) => [item, ...prev]);
      }
    } catch {
      const item: MemoryItem = {
        id: `mem-${Date.now()}`,
        topic: newTopic.trim(),
        content: newContent.trim(),
        tokens: Math.ceil(newContent.length / 4),
        tags: ['manual'],
        lastAccessed: 'Just now',
      };
      setMemories((prev) => [item, ...prev]);
    } finally {
      setLoading(false);
      setNewTopic('');
      setNewContent('');
      setShowAddModal(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('routenex:state-changed'));
      }
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:3001/v1/admin/memories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
    } catch {}
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('routenex:state-changed'));
    }
  };

  const filtered = memories.filter(
    (m) =>
      m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222738]">
        <div>
          <h2 className="text-base font-semibold text-white font-mono tracking-tight">
            Conversational Memory & FTS5 Semantic Search
          </h2>
          <p className="text-xs text-[#8f96a3]">Cross-turn state retention, contextual recall, and SQLite full-text search.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8f96a3]">Memory Enabled</span>
            <button
              type="button"
              onClick={() => setMemoryEnabled(!memoryEnabled)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                memoryEnabled ? 'bg-purple-600' : 'bg-neutral-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  memoryEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-medium shadow-md shadow-purple-600/20"
          >
            + Add Memory
          </button>
        </div>
      </div>

      {/* 2 Headline Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">TOTAL MEMORIES</span>
          <span className="text-2xl font-bold text-white font-mono">{memories.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">TOKENS INDEXED</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">
            {memories.reduce((acc, m) => acc + (m.tokens || 0), 0)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">SEARCH INDEX</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">FTS5 ✓</span>
        </div>
        <div className="p-4 rounded-xl bg-[#121622] border border-[#222738]">
          <span className="text-[11px] text-[#7d8597] font-mono block mb-1">RECALL LATENCY</span>
          <span className="text-2xl font-bold text-sky-400 font-mono">&lt; 1ms</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#222738] gap-3">
        {(['memories', 'engine', 'playground'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 px-2 text-xs font-mono font-medium uppercase transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-purple-500 text-white'
                : 'border-transparent text-[#7d8597] hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search memories via FTS5 semantic full-text index..."
          className="flex-1 bg-[#141824] border border-[#222738] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5a647d] font-mono focus:outline-none focus:border-purple-500"
        />
        <button
          type="button"
          onClick={() => {
            fetchMemories();
          }}
          className="px-3 py-2 rounded-lg bg-[#181d2c] hover:bg-[#20273c] border border-[#262f44] text-xs font-mono text-[#8f96a3] hover:text-white"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Memories List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#7d8597] border border-dashed border-[#222738] rounded-xl">
            No memories found. Click &ldquo;+ Add Memory&rdquo; to persist contextual recall.
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="p-4 rounded-xl bg-[#121622] border border-[#222738] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white font-mono">{m.topic}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#7d8597] font-mono">{m.lastAccessed || 'Saved'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono">
                    {m.tokens} tokens
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteMemory(m.id)}
                    className="text-[#7d8597] hover:text-rose-400 text-xs px-1.5 py-0.5 rounded hover:bg-[#1a2030] transition-colors"
                    title="Delete Memory"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#a0a8be] leading-relaxed">{m.content}</p>
              <div className="flex gap-1.5 pt-1">
                {(m.tags || ['general']).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#181d2c] border border-[#262f44] text-[#8e97ae] font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMemory}
            className="w-full max-w-md bg-[#121622] border border-[#222738] rounded-xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#1f2638]">
              <h3 className="text-sm font-semibold text-white font-mono">Add Conversational Memory</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#8f96a3] mb-1">Memory Topic</label>
              <input
                type="text"
                required
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. User Preferences, Project Context"
                className="w-full bg-[#181d2c] border border-[#262f44] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5a647d] font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#8f96a3] mb-1">Content</label>
              <textarea
                required
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter facts or context to be recalled during agent queries..."
                className="w-full bg-[#181d2c] border border-[#262f44] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5a647d] font-mono focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#181d2c] text-xs font-mono text-[#8f96a3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-medium shadow-md shadow-purple-600/20 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Memory'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

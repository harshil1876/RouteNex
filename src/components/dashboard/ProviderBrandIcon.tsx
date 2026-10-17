import React from 'react';

interface ProviderBrandIconProps {
  id: string;
  className?: string;
}

export default function ProviderBrandIcon({ id, className = 'w-5 h-5' }: ProviderBrandIconProps) {
  const normalizedId = (id || '').toLowerCase();

  // Google Antigravity & Antigravity CLI
  if (normalizedId.includes('antigravity')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#0E0F12" stroke="#222226" strokeWidth="1" />
        <path
          d="M12 4.2L4.5 19.5H7.8L9.6 15.6H14.4L16.2 19.5H19.5L12 4.2ZM10.7 13.1L12 8.4L13.3 13.1H10.7Z"
          fill="url(#antigravity-brand-grad)"
        />
        <circle cx="12" cy="10.5" r="1.6" fill="#38BDF8" />
        <defs>
          <linearGradient id="antigravity-brand-grad" x1="4.5" y1="4.2" x2="19.5" y2="19.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="0.5" stopColor="#818CF8" />
            <stop offset="1" stopColor="#C084FC" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Anthropic / Claude
  if (normalizedId.includes('anthropic') || normalizedId.includes('claude')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M13.5 4.5l6 15h-3l-1.2-3.2h-6.6L7.5 19.5h-3l6-15h3zm-1.5 4.3L9.6 14h4.8L12 8.8z" fill="#D97706" />
      </svg>
    );
  }

  // OpenAI / ChatGPT / Codex
  if (normalizedId.includes('openai') || normalizedId.includes('gpt') || normalizedId.includes('chatgpt') || normalizedId.includes('codex')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947z" fill="#10A37F" />
      </svg>
    );
  }

  // Google Gemini
  if (normalizedId.includes('google') || normalizedId.includes('gemini')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z" fill="url(#gemini-grad)" />
        <defs>
          <linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4E82EE" />
            <stop offset="0.5" stopColor="#9B72CF" />
            <stop offset="1" stopColor="#E06D53" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Groq LPU
  if (normalizedId.includes('groq')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#F55036" />
        <path d="M7 12h10M12 7v10" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Cerebras CS-3
  if (normalizedId.includes('cerebras')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#1B1C1D" />
        <path d="M6 12l6-6 6 6-6 6-6-6z" fill="#FF5E00" />
      </svg>
    );
  }

  // Mistral AI
  if (normalizedId.includes('mistral') || normalizedId.includes('codestral')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="4" height="16" fill="#F97316" />
        <rect x="7" y="8" width="4" height="4" fill="#EA580C" />
        <rect x="11" y="4" width="4" height="16" fill="#F97316" />
        <rect x="15" y="8" width="4" height="4" fill="#EA580C" />
        <rect x="17" y="4" width="4" height="16" fill="#F97316" />
      </svg>
    );
  }

  // DeepSeek
  if (normalizedId.includes('deepseek')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#0E1D38" />
        <path d="M6 15c2-3 5-5 8-5 2.5 0 4 1.5 4 4 0 2.5-2 4-4 4-4 0-6.5-2-8-3z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="15" cy="14" r="1.5" fill="#60A5FA" />
      </svg>
    );
  }

  // SiliconFlow
  if (normalizedId.includes('siliconflow')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#2563EB" />
        <path d="M8 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // Meta / Llama
  if (normalizedId.includes('meta') || normalizedId.includes('llama')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="#0668E1">
        <path d="M12 6.5C8.5 2 3 3.5 3 8.5c0 4.5 4.5 7.5 9 11 4.5-3.5 9-6.5 9-11 0-5-5.5-6.5-9-2z" />
      </svg>
    );
  }

  // NVIDIA NIM
  if (normalizedId.includes('nvidia')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#76B900" />
        <path d="M12 7c-3 0-5.5 2-6 5 1-2 3-3 6-3 4 0 6 3 6 5 0 2.5-2 4.5-5 4.5-2 0-3.5-1-4-2.5 1 1 2 1.5 3.5 1.5 2 0 3.5-1.5 3.5-3.5C16 11.5 14 7 12 7z" fill="#FFFFFF" />
      </svg>
    );
  }

  // OpenRouter
  if (normalizedId.includes('openrouter')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#6366F1" />
        <circle cx="8" cy="8" r="3" fill="#FFFFFF" />
        <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
        <path d="M8 8l8 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // GitHub Copilot
  if (normalizedId.includes('github') || normalizedId.includes('copilot')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    );
  }

  // Amazon Q
  if (normalizedId.includes('amazon') || normalizedId.includes('amazonq')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#FF9900" />
        <path d="M12 6a5 5 0 1 0 3.8 8.2l2.2 2.2-1.4 1.4-2.2-2.2A5 5 0 0 0 12 6zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" fill="#232F3E" />
      </svg>
    );
  }

  // Moonshot Kimi
  if (normalizedId.includes('kimi') || normalizedId.includes('moonshot')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#000000" />
        <circle cx="12" cy="12" r="6" fill="#FACC15" />
        <circle cx="10" cy="10" r="5" fill="#000000" />
      </svg>
    );
  }

  // Cursor IDE
  if (normalizedId.includes('cursor')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M4 4l16 7-7 2-2 7-7-16z" fill="#000000" stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>
    );
  }

  // Cline
  if (normalizedId.includes('cline')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#10B981" />
        <path d="M7 12l3 3 7-7" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Pollinations
  if (normalizedId.includes('pollinations')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="#F43F5E" />
        <circle cx="12" cy="6" r="3" fill="#FB7185" />
        <circle cx="12" cy="18" r="3" fill="#FB7185" />
        <circle cx="6" cy="12" r="3" fill="#FB7185" />
        <circle cx="18" cy="12" r="3" fill="#FB7185" />
      </svg>
    );
  }

  // DuckDuckGo
  if (normalizedId.includes('duckduckgo')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#DE5833" />
        <circle cx="10" cy="10" r="2" fill="#FFFFFF" />
        <path d="M12 12c2 0 4 1 5 3-2 1-4 1-6 0" fill="#FFC83B" />
      </svg>
    );
  }

  // Perplexity
  if (normalizedId.includes('perplexity')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#20B2AA" />
        <path d="M7 7h10v10H7z" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M12 4v16M4 12h16" stroke="#FFFFFF" strokeWidth="2" />
      </svg>
    );
  }

  // Ollama Local
  if (normalizedId.includes('ollama')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <circle cx="9" cy="11" r="1.5" fill="currentColor" />
        <circle cx="15" cy="11" r="1.5" fill="currentColor" />
        <path d="M10 15c1 1 3 1 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Default fallback icon
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

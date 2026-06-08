'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeminiChatHistory, ResearchAssistantMessage } from '@/lib/ai/types';

type ChatApiResponse =
  | { ok: true; reply: string; history: GeminiChatHistory }
  | { ok: false; error: string };

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function JournalistChatWidget() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeminiChatHistory>([]);
  const [messages, setMessages] = useState<ResearchAssistantMessage[]>(() => [
    {
      // Stable ID to avoid SSR/CSR hydration mismatch.
      id: 'model-initial',
      role: 'model',
      parts: [
        {
          type: 'text',
          text:
            'Hi — I can help summarize releases, extract key facts, and draft outreach angles. What are you working on?',
        },
      ],
    },
  ]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const canSend = useMemo(() => text.trim().length > 0 && !pending, [text, pending]);

  async function send() {
    const msg = text.trim();
    if (!msg || pending) return;
    setText('');
    setError(null);
    setPending(true);

    const userMessage: ResearchAssistantMessage = {
      id: uid('user'),
      role: 'user',
      parts: [{ type: 'text', text: msg }],
    };
    setMessages((m) => [...m, userMessage]);

    try {
      const res = await fetch('/api/journalist/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      const json = (await res.json()) as ChatApiResponse;
      if (!res.ok || !json.ok) {
        setError(!json.ok ? json.error : 'Request failed.');
        return;
      }
      setHistory(json.history);
      const modelMessage: ResearchAssistantMessage = {
        id: uid('model'),
        role: 'model',
        parts: [{ type: 'text', text: json.reply }],
      };
      setMessages((m) => [...m, modelMessage]);
    } catch (e: any) {
      setError(e?.message ?? 'Request failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {open ? (
        <div className="w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-brand-border bg-white shadow-media-soft">
          <div className="flex items-center justify-between border-b border-brand-border bg-brand-surface px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-brand-ink">Research assistant</div>
              <div className="text-xs text-brand-muted">Gemini (text-only for now)</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-muted hover:text-brand-ink hover:underline"
            >
              Collapse
            </button>
          </div>

          <div ref={listRef} className="max-h-[360px] overflow-y-auto p-3 text-sm">
            <div className="space-y-3">
              {messages.map((m) => {
                const textPart = m.parts.find((p: any) => p.type === 'text') as any;
                const bubble =
                  m.role === 'user'
                    ? 'ml-auto bg-teal-50 text-teal-900 ring-1 ring-inset ring-teal-700'
                    : 'mr-auto bg-white text-brand-ink ring-1 ring-inset ring-brand-border';
                return (
                  <div
                    key={m.id}
                    className={'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ' + bubble}
                  >
                    {textPart?.text ?? ''}
                  </div>
                );
              })}
              {pending ? (
                <div className="mr-auto max-w-[85%] rounded-lg px-3 py-2 text-sm text-brand-muted ring-1 ring-inset ring-brand-border">
                  Thinking…
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="border-t border-brand-border bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          ) : null}

          <div className="border-t border-brand-border p-3">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask about a brand, venue, or angle…"
                className="h-10 flex-1 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-1"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="bb-btn-primary-sm disabled:opacity-60"
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-[11px] text-brand-muted">
              Tip: paste a press release excerpt and ask for a 3-bullet brief.
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-brand-dark px-4 py-3 text-sm font-medium text-white shadow-media-soft"
        >
          Chat
        </button>
      )}
    </div>
  );
}


'use client';

import type { ResearchAssistantMessage } from '@/lib/ai/types';

type ChatPanelProps = {
  /**
   * Max inline attachments per user message (images / PDF) when multimodal
   * upload is enabled — aligns with Gemini multimodal context limits in product.
   */
  maxAttachmentsPerMessage?: number;
};

const PLACEHOLDER_HISTORY: ResearchAssistantMessage[] = [
  {
    id: 'placeholder-1',
    role: 'model',
    parts: [{ type: 'text', text: '…' }],
  },
];

/**
 * Journalist Research Assistant shell. Wire to `/api/journalist/chat` and pass
 * multimodal parts (see `lib/ai/multimodal`) for menu / press-kit analysis.
 */
export function ChatPanel({ maxAttachmentsPerMessage = 4 }: ChatPanelProps) {
  const _reservedForHydration = PLACEHOLDER_HISTORY;

  return (
    <aside className="fixed bottom-4 right-4 max-w-sm rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-600 shadow">
      <p className="font-medium text-neutral-800">
        Research assistant (Gemini)
      </p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        Multimodal-ready: text, images, and PDFs for APAC F&B and travel
        discovery — menus, venues, press kits. Implementation Batch 4 · Powered
        by Google Gemini 2.0 Flash / Pro via `@google/generative-ai`.
      </p>
      <p className="mt-2 text-xs text-neutral-400" aria-hidden>
        Max {maxAttachmentsPerMessage} attachment(s) per message (planned).
      </p>
      <span className="sr-only">
        Placeholder history length: {_reservedForHydration.length}
      </span>
    </aside>
  );
}

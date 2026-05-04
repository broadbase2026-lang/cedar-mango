# QA — manual checklist

## Pre-launch configuration

## Brand flows

## Journalist flows

## Embargo flow

## Digest flow

## Stripe webhook

## AI integration (Google Gemini)

**Provider:** Google Generative AI (`@google/generative-ai`), not Anthropic.

**Env:** `GEMINI_API_KEY` (required for AI features). Optional: `GEMINI_MODEL_FLASH`, `GEMINI_MODEL_PRO` to override model IDs (defaults: `gemini-2.0-flash`, `gemini-2.0-pro`).

**Use cases**

1. **Press release AI Readiness Score** — `press_releases.ai_readiness_score` (0–100). Server jobs or brand upload flow call Gemini with `PRESS_RELEASE_AI_READINESS_SYSTEM` (see `lib/ai/prompts.ts`), ideally with `responseMimeType: application/json` for structured output. Pro tier can be used for long releases; Flash for fast iteration.
2. **Journalist Research Assistant** — Multimodal chat: text + inline images (menus, venue photos) and PDFs via `lib/ai/multimodal.ts` and `JOURNALIST_RESEARCH_ASSISTANT_SYSTEM`. API: `/api/journalist/chat` (to be implemented). Client: `components/journalist/ChatPanel.tsx`.

**Manual checks**

- [ ] `GEMINI_API_KEY` set in deployment environment (never commit real keys).
- [ ] Model IDs valid for your region. Defaults (`gemini-2.0-flash`, `gemini-2.0-pro`) are available in Hong Kong; elsewhere verify in [Google AI Studio](https://aistudio.google.com/).
- [ ] After wiring routes, exercise text-only and one image+text request for the research assistant.

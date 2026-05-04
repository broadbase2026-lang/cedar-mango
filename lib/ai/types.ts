import type { Content } from '@google/generative-ai';

/** Stored score on `press_releases.ai_readiness_score` (0–100). */
export type AiReadinessScore = number;

/**
 * Model output for computing AI readiness (persist integer portion to DB).
 * Keep fields stable for JSON parsing in `/api/ai` batch jobs.
 */
export interface PressReleaseReadinessResult {
  score: AiReadinessScore;
  summary: string;
  suggestions: string[];
}

/** Role for UI/chat persistence (maps to Gemini chat history `Content.role`). */
export type ResearchAssistantMessageRole = 'user' | 'model';

export interface ResearchAssistantTextMessage {
  id: string;
  role: ResearchAssistantMessageRole;
  parts: { type: 'text'; text: string }[];
}

export interface ResearchAssistantMultimodalMessage {
  id: string;
  role: ResearchAssistantMessageRole;
  parts: (
    | { type: 'text'; text: string }
    | {
        type: 'inline';
        mimeType: string;
        /** Base64 payload; large — prefer server-side handling in production. */
        data: string;
      }
  )[];
}

export type ResearchAssistantMessage =
  | ResearchAssistantTextMessage
  | ResearchAssistantMultimodalMessage;

/**
 * Serializable chat history for `startChat` / multi-turn APIs.
 */
export type GeminiChatHistory = Pick<Content, 'role' | 'parts'>[];

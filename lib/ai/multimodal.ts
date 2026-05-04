import type {
  GenerativeContentBlob,
  InlineDataPart,
  Part,
} from '@google/generative-ai';

/** Inline attachments accepted by Gemini for menus, press kits, and travel imagery. */
export const GEMINI_INLINE_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export type GeminiInlineImageMimeType =
  (typeof GEMINI_INLINE_IMAGE_MIME_TYPES)[number];

export const GEMINI_INLINE_DOCUMENT_MIME_TYPES = [
  'application/pdf',
] as const;

export type GeminiDocumentMimeType =
  (typeof GEMINI_INLINE_DOCUMENT_MIME_TYPES)[number];

export type GeminiUserAttachmentMimeType =
  | GeminiInlineImageMimeType
  | GeminiDocumentMimeType;

function isMimeType<T extends string>(
  value: string,
  allowed: readonly T[]
): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function assertSupportedGeminiMimeType(
  mimeType: string
): asserts mimeType is GeminiUserAttachmentMimeType {
  if (
    !isMimeType(mimeType, GEMINI_INLINE_IMAGE_MIME_TYPES) &&
    !isMimeType(mimeType, GEMINI_INLINE_DOCUMENT_MIME_TYPES)
  ) {
    throw new Error(
      `Unsupported MIME type for Gemini inline data: ${mimeType}`
    );
  }
}

/**
 * Builds an SDK {@link Part} for inline image or PDF bytes (base64).
 */
export function inlineDataPart(blob: GenerativeContentBlob): InlineDataPart {
  return { inlineData: blob };
}

export function buildInlineDataPart(
  mimeType: GeminiUserAttachmentMimeType,
  base64Data: string
): InlineDataPart {
  return inlineDataPart({ mimeType, data: base64Data });
}

/**
 * Combines a user text prompt with optional inline attachments for multimodal turns.
 */
export function buildUserContentParts(
  text: string,
  attachments: readonly GenerativeContentBlob[] = []
): Part[] {
  const parts: Part[] = [{ text }];
  for (const blob of attachments) {
    parts.push(inlineDataPart(blob));
  }
  return parts;
}

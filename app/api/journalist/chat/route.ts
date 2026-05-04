import { tryCreateGoogleGenAI } from '@/lib/ai';
import { NextResponse } from 'next/server';

/**
 * Journalist Research Assistant (multimodal Gemini). Not yet implemented.
 */
export async function POST() {
  if (!tryCreateGoogleGenAI()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Gemini is not configured (set GEMINI_API_KEY). Research assistant unavailable.',
      },
      { status: 503 }
    );
  }
  return NextResponse.json(
    {
      success: false,
      error:
        'Journalist chat (Gemini multimodal) not implemented — Batch 4 / `lib/ai`',
    },
    { status: 501 }
  );
}

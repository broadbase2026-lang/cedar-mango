import { tryCreateGoogleGenAI } from '@/lib/ai';
import { NextResponse } from 'next/server';

/**
 * Brand-side AI (e.g. press release AI Readiness score). Uses Gemini; not yet implemented.
 */
export async function POST() {
  if (!tryCreateGoogleGenAI()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Gemini is not configured (set GEMINI_API_KEY). AI Readiness scoring unavailable.',
      },
      { status: 503 }
    );
  }
  return NextResponse.json(
    {
      success: false,
      error:
        'AI Readiness (Gemini) not implemented — wire `lib/ai` + press release job (Batch 5)',
    },
    { status: 501 }
  );
}

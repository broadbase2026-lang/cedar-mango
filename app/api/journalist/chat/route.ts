import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getGeminiGenerativeModel,
  JOURNALIST_RESEARCH_ASSISTANT_SYSTEM,
  type GeminiChatHistory,
} from '@/lib/ai';
import {
  geminiUnsupportedLocationUserMessage,
  isGeminiUnsupportedLocationError,
} from '@/lib/ai/gemini-errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string().max(2000) })),
      })
    )
    .max(10)
    .optional(),
});

const MAX_HISTORY_CHARS = 10_000;

type RetrievedRelease = {
  title: string;
  summary: string | null;
  brand_name: string | null;
  published_at: string | null;
  industry_vertical: string | null;
  tags: string[] | null;
  slug: string;
};

type ChatSource = {
  title: string;
  slug: string;
  brand_name: string | null;
  published_at: string | null;
  industry_vertical: string | null;
  tags: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function brandNameFromRow(brands: unknown): string | null {
  if (!isRecord(brands)) return null;
  const name = brands.name;
  return typeof name === 'string' ? name : null;
}

function formatReleasesContext(rows: RetrievedRelease[]): string {
  if (rows.length === 0) {
    return 'No matching press releases found for this query.';
  }
  const lines: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const n = i + 1;
    const tags =
      Array.isArray(r.tags) && r.tags.length > 0 ? r.tags.join(', ') : '—';
    const summary = r.summary?.trim() ? r.summary : '—';
    const pub = r.published_at ?? '—';
    const vertical = r.industry_vertical ?? '—';
    const brand = r.brand_name ?? '—';
    lines.push(
      `${n}. ${r.title}`,
      `   Brand: ${brand}`,
      `   Published: ${pub}`,
      `   Vertical: ${vertical}`,
      `   Tags: ${tags}`,
      `   Summary: ${summary}`,
      `   Slug: ${r.slug}`
    );
  }
  return lines.join('\n');
}

export async function POST(req: Request) {
  const parsed = ChatSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, ok: false, error: 'Unauthorised.' },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.user_type !== 'journalist') {
    return NextResponse.json(
      { success: false, ok: false, error: 'Unauthorised.' },
      { status: 401 }
    );
  }

  const messageText = parsed.data.message.trim();
  if (!messageText) {
    return NextResponse.json(
      { success: false, ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }

  let history: GeminiChatHistory = parsed.data.history ?? [];
  let historyChars = history.reduce(
    (n, h) =>
      n +
      h.parts.reduce((m, p) => m + (p.text ?? '').length, 0),
    0
  );
  while (historyChars > MAX_HISTORY_CHARS && history.length > 0) {
    const removed = history.shift();
    if (!removed) break;
    historyChars -= removed.parts.reduce(
      (m, p) => m + (p.text ?? '').length,
      0
    );
  }

  const window = new Date();
  window.setMinutes(0, 0, 0);
  const windowIso = window.toISOString();

  const adminClient = createAdminClient();
  const { data: priorRate } = await adminClient
    .from('chat_rate_limits')
    .select('request_count')
    .eq('journalist_id', user.id)
    .eq('window_start', windowIso)
    .maybeSingle();

  const nextRequestCount = (priorRate?.request_count ?? 0) + 1;

  const { data: rateData } = await adminClient
    .from('chat_rate_limits')
    .upsert(
      {
        journalist_id: user.id,
        window_start: windowIso,
        request_count: nextRequestCount,
      },
      {
        onConflict: 'journalist_id,window_start',
        ignoreDuplicates: false,
      }
    )
    .select('request_count')
    .single();

  if ((rateData?.request_count ?? 0) > 20) {
    return NextResponse.json(
      {
        success: false,
        ok: false,
        error:
          'Rate limit reached. You can send 20 messages per hour. Try again shortly.',
      },
      { status: 429 }
    );
  }

  const { data: rawRows, error: searchError } = await supabase
    .from('press_releases')
    .select('title, slug, summary, published_at, industry_vertical, tags, brands(name)')
    .textSearch('fts', messageText, {
      type: 'plain',
      config: 'english',
    })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(8);

  if (searchError) {
    return NextResponse.json(
      { success: false, ok: false, error: 'Search failed.' },
      { status: 500 }
    );
  }

  const retrieved: RetrievedRelease[] = (rawRows ?? []).map((row: unknown) => {
    if (!isRecord(row)) {
      return {
        title: '',
        summary: null,
        brand_name: null,
        published_at: null,
        industry_vertical: null,
        tags: null,
        slug: '',
      };
    }
    const title = typeof row.title === 'string' ? row.title : '';
    const slug = typeof row.slug === 'string' ? row.slug : '';
    const summary = typeof row.summary === 'string' ? row.summary : null;
    const published_at =
      typeof row.published_at === 'string' ? row.published_at : null;
    const industry_vertical =
      typeof row.industry_vertical === 'string' ? row.industry_vertical : null;
    const tags = Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === 'string')
      : null;
    return {
      title,
      slug,
      summary,
      published_at,
      industry_vertical,
      tags,
      brand_name: brandNameFromRow(row.brands),
    };
  });

  const releasesContext = formatReleasesContext(retrieved);

  const sources: ChatSource[] = retrieved.map((r) => ({
    title: r.title,
    slug: r.slug,
    brand_name: r.brand_name,
    published_at: r.published_at,
    industry_vertical: r.industry_vertical,
    tags: r.tags ?? [],
  }));

  const systemInstruction = JOURNALIST_RESEARCH_ASSISTANT_SYSTEM.replace(
    '{RELEASES_CONTEXT}',
    releasesContext
  );

  try {
    const model = getGeminiGenerativeModel({
      tier: 'flash',
      systemInstruction,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(messageText);
    const reply = result.response.text();

    const newHistory: GeminiChatHistory = [
      ...history,
      { role: 'user', parts: [{ text: messageText }] },
      { role: 'model', parts: [{ text: reply }] },
    ];

    return NextResponse.json({
      success: true,
      ok: true,
      reply,
      history: newHistory,
      sources,
    });
  } catch (e: unknown) {
    const rawMessage =
      e instanceof Error ? e.message : 'Chat failed.';
    if (isGeminiUnsupportedLocationError(rawMessage)) {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: geminiUnsupportedLocationUserMessage(),
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, ok: false, error: rawMessage },
      { status: 500 }
    );
  }
}

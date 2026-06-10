import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AiRateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
};

/**
 * Per-user, per-endpoint hourly rate limit for expensive AI routes.
 *
 * Uses a service-role client to read+upsert the `ai_rate_limits` row for
 * the current hour window. Mirrors the journalist chat limiter so behaviour
 * is consistent across AI endpoints.
 *
 * Fails open on database errors (e.g. table not yet migrated) so an
 * infrastructure problem degrades to "no limit" rather than blocking all
 * AI usage — matching the existing chat limiter's tolerance.
 */
export async function enforceAiRateLimit(
  admin: SupabaseClient,
  userId: string,
  endpoint: string,
  limit: number
): Promise<AiRateLimitResult> {
  const window = new Date();
  window.setMinutes(0, 0, 0);
  const windowIso = window.toISOString();

  const { data: prior } = await admin
    .from('ai_rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .eq('window_start', windowIso)
    .maybeSingle();

  const nextRequestCount = (prior?.request_count ?? 0) + 1;

  const { data: updated } = await admin
    .from('ai_rate_limits')
    .upsert(
      {
        user_id: userId,
        endpoint,
        window_start: windowIso,
        request_count: nextRequestCount,
      },
      { onConflict: 'user_id,endpoint,window_start', ignoreDuplicates: false }
    )
    .select('request_count')
    .single();

  const count = updated?.request_count ?? nextRequestCount;
  return { allowed: count <= limit, count, limit };
}

export function aiRateLimitMessage(limit: number): string {
  return `Rate limit reached. You can run up to ${limit} AI requests per hour. Try again shortly.`;
}

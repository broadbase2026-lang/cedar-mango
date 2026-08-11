import type { SupabaseClient } from '@supabase/supabase-js';

export type RecordReleaseViewInput = {
  supabase: SupabaseClient;
  journalistId: string;
  pressReleaseId: string;
  brandId: string;
};

/**
 * Inserts a row into `release_views`. RLS requires journalist_id = auth.uid().
 * Failures are logged but never thrown — analytics must not block page loads.
 */
export async function recordReleaseView(
  input: RecordReleaseViewInput
): Promise<void> {
  const { supabase, journalistId, pressReleaseId, brandId } = input;

  const { error } = await supabase.from('release_views').insert({
    press_release_id: pressReleaseId,
    brand_id: brandId,
    journalist_id: journalistId,
  });

  if (error) {
    console.error('[recordReleaseView] insert failed', {
      pressReleaseId,
      brandId,
      message: error.message,
    });
  }
}

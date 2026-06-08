import type { SupabaseClient } from '@supabase/supabase-js';

export type JournalistSettingsSnapshot = {
  fullName: string | null;
  avatarUrl: string | null;
  publication: string | null;
  beats: string[];
  bio: string | null;
  linkedinUrl: string | null;
  digestFrequency: 'daily' | 'weekly' | 'never';
};

export async function loadJournalistSettingsSnapshot(input: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<JournalistSettingsSnapshot> {
  const { supabase, userId } = input;

  const [{ data: profile }, { data: jp }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', userId).maybeSingle(),
    supabase
      .from('journalist_profiles')
      .select('publication, beats, bio, linkedin_url, digest_frequency')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  return {
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    publication: jp?.publication ?? null,
    beats: (jp?.beats ?? []) as string[],
    bio: jp?.bio ?? null,
    linkedinUrl: jp?.linkedin_url ?? null,
    digestFrequency: ((jp?.digest_frequency ?? 'daily') as any) as JournalistSettingsSnapshot['digestFrequency'],
  };
}


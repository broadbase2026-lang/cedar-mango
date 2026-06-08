'use server';

import { revalidatePath } from 'next/cache';
import { getJournalistPortalSession } from '@/lib/journalist/session';

function cleanText(raw: string): string {
  return raw.trim();
}

function parseBeats(raw: string): string[] {
  const items = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const dedup = Array.from(new Set(items));
  return dedup.slice(0, 20).map((x) => x.slice(0, 40));
}

export type JournalistSettingsActionState = {
  ok: boolean;
  message?: string;
};

export async function updateJournalistAvatar(
  _prevState: JournalistSettingsActionState,
  formData: FormData
): Promise<JournalistSettingsActionState> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return { ok: false, message: 'Not signed in.' };

  const avatarUrl = String(formData.get('avatar_url') ?? '').trim();
  if (!avatarUrl) return { ok: false, message: 'Missing avatar URL.' };

  const { error } = await session.supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', session.user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/journalist/settings');
  revalidatePath('/journalist/discover');
  return { ok: true };
}

export async function updateJournalistSettings(
  _prevState: JournalistSettingsActionState,
  formData: FormData
): Promise<JournalistSettingsActionState> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return { ok: false, message: 'Not signed in.' };

  const fullName = cleanText(String(formData.get('fullName') ?? '')).slice(0, 120) || null;
  const publication = cleanText(String(formData.get('publication') ?? '')).slice(0, 120) || null;
  const beats = parseBeats(String(formData.get('beats') ?? ''));
  const bio = cleanText(String(formData.get('bio') ?? '')).slice(0, 800) || null;
  const linkedinUrl = cleanText(String(formData.get('linkedinUrl') ?? '')).slice(0, 300) || null;
  const digestFrequencyRaw = String(formData.get('digestFrequency') ?? 'daily');
  const digestFrequency =
    digestFrequencyRaw === 'weekly' || digestFrequencyRaw === 'never' ? digestFrequencyRaw : 'daily';

  // profiles.full_name (RLS owner update)
  const profileRes = await session.supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', session.user.id);
  if (profileRes.error) return { ok: false, message: profileRes.error.message };

  // journalist_profiles row may not exist yet; upsert it.
  const journalistRes = await session.supabase.from('journalist_profiles').upsert(
    {
      id: session.user.id,
      publication,
      beats,
      bio,
      linkedin_url: linkedinUrl,
      digest_frequency: digestFrequency,
    },
    { onConflict: 'id' }
  );
  if (journalistRes.error) return { ok: false, message: journalistRes.error.message };

  revalidatePath('/journalist/settings');
  revalidatePath('/journalist/discover');
  return { ok: true };
}


'use server';

import { revalidatePath } from 'next/cache';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export async function followBrand(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const brandId = String(formData.get('brandId') ?? '').trim();
  if (!brandId) return;

  const { error } = await session.supabase.from('journalist_follows').insert({
    journalist_id: session.user.id,
    brand_id: brandId,
  });

  if (error && error.code !== '23505') return;
  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
  revalidatePath('/journalist/folders');
}

export async function unfollowBrand(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const brandId = String(formData.get('brandId') ?? '').trim();
  if (!brandId) return;

  await session.supabase
    .from('journalist_follows')
    .delete()
    .eq('journalist_id', session.user.id)
    .eq('brand_id', brandId);

  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
}

export async function toggleSaveReleaseToFolder(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const pressReleaseId = String(formData.get('pressReleaseId') ?? '').trim();
  const folderId = String(formData.get('folderId') ?? '').trim();
  if (!pressReleaseId || !folderId) return;

  const { data: existing } = await session.supabase
    .from('journalist_folder_releases')
    .select('folder_id')
    .eq('journalist_id', session.user.id)
    .eq('folder_id', folderId)
    .eq('press_release_id', pressReleaseId)
    .maybeSingle();

  if (existing) {
    await session.supabase
      .from('journalist_folder_releases')
      .delete()
      .eq('journalist_id', session.user.id)
      .eq('folder_id', folderId)
      .eq('press_release_id', pressReleaseId);
  } else {
    const { error } = await session.supabase.from('journalist_folder_releases').insert({
      journalist_id: session.user.id,
      folder_id: folderId,
      press_release_id: pressReleaseId,
    });
    if (error && error.code !== '23505') return;
  }

  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
  revalidatePath('/journalist/folders');
}


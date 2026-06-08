'use server';

import { revalidatePath } from 'next/cache';
import { getJournalistPortalSession } from '@/lib/journalist/session';

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 100);
}

export async function createFolder(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const name = cleanName(String(formData.get('name') ?? ''));
  if (!name) return;

  await session.supabase.from('journalist_folders').insert({
    journalist_id: session.user.id,
    name,
  });

  revalidatePath('/journalist/folders');
  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
}

export async function renameFolder(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const folderId = String(formData.get('folderId') ?? '').trim();
  const name = cleanName(String(formData.get('name') ?? ''));
  if (!folderId || !name) return;

  await session.supabase
    .from('journalist_folders')
    .update({ name })
    .eq('id', folderId)
    .eq('journalist_id', session.user.id);

  revalidatePath('/journalist/folders');
  revalidatePath(`/journalist/folders/${folderId}`);
  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
}

export async function deleteFolder(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const folderId = String(formData.get('folderId') ?? '').trim();
  if (!folderId) return;

  await session.supabase
    .from('journalist_folders')
    .delete()
    .eq('id', folderId)
    .eq('journalist_id', session.user.id);

  revalidatePath('/journalist/folders');
  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
}

export async function removeFromFolder(formData: FormData): Promise<void> {
  const session = await getJournalistPortalSession();
  if (!session.ok) return;

  const folderId = String(formData.get('folderId') ?? '').trim();
  const pressReleaseId = String(formData.get('pressReleaseId') ?? '').trim();
  if (!folderId || !pressReleaseId) return;

  await session.supabase
    .from('journalist_folder_releases')
    .delete()
    .eq('folder_id', folderId)
    .eq('press_release_id', pressReleaseId)
    .eq('journalist_id', session.user.id);

  revalidatePath('/journalist/folders');
  revalidatePath(`/journalist/folders/${folderId}`);
  revalidatePath('/journalist/discover');
  revalidatePath('/journalist/search');
}


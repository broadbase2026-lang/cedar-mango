import { redirect } from 'next/navigation';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { getBrandPortalSession } from '@/lib/brand/session';
import { NewReleaseForm } from '@/components/brand/new-release-form';
import { ReleaseAiReadinessPanel } from '@/components/brand/release-ai-readiness-panel';
import { releaseImageFromRow, type ReleaseImageAsset } from '@/lib/brand/release-asset-model';
import { resolveReleaseEditorReturnTo } from '@/lib/brand/release-editor-url';
import {
  MAX_IMAGES_PER_PRESS_RELEASE,
  MAX_TRIAL_IMAGES_PER_PRESS_RELEASE,
} from '@/lib/constants/uploads';

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function NewPressReleasePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    redirect('/login');
  }
  if (!session.brand) {
    redirect('/brand/settings');
  }

  const { data: subscriptionRow } = await session.supabase
    .from('subscriptions')
    .select('trial_mode, plan')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  const subscription = applyDevSubscriptionOverrides(
    session.user.id,
    subscriptionRow
  );

  const maxPendingImages = subscription?.trial_mode
    ? MAX_TRIAL_IMAGES_PER_PRESS_RELEASE
    : MAX_IMAGES_PER_PRESS_RELEASE;
  const plan = (subscription as any)?.plan ?? null;

  const editId = first(searchParams?.edit) ?? null;
  const returnTo = resolveReleaseEditorReturnTo(first(searchParams?.next));

  // Prefer selecting image_link; if migration 023 is not applied yet, PostgREST
  // errors and we fall back so drafts remain editable.
  const RELEASE_SELECT_WITH_IMAGE_LINK =
    'id, title, summary, body, image_link, industry_vertical, tags, status, embargo_until, ai_readiness_score';
  const RELEASE_SELECT_BASE =
    'id, title, summary, body, industry_vertical, tags, status, embargo_until, ai_readiness_score';

  let existing: {
    data: {
      id: string;
      title: string | null;
      summary: string | null;
      body: string | null;
      image_link?: string | null;
      industry_vertical: string | null;
      tags: string[] | null;
      status: string | null;
      embargo_until: string | null;
      ai_readiness_score: number | null;
    } | null;
    error: { message?: string } | null;
  } | null = null;

  if (editId) {
    const primary = await session.supabase
      .from('press_releases')
      .select(RELEASE_SELECT_WITH_IMAGE_LINK)
      .eq('id', editId)
      .eq('brand_id', session.brand.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (primary.error) {
      console.error(
        '[NewPressReleasePage] draft select failed; retrying without image_link',
        primary.error
      );
      const fallback = await session.supabase
        .from('press_releases')
        .select(RELEASE_SELECT_BASE)
        .eq('id', editId)
        .eq('brand_id', session.brand.id)
        .is('deleted_at', null)
        .maybeSingle();
      existing = fallback;
    } else {
      existing = primary;
    }
  }

  // Only allow editing draft/archived content from this UI. Published releases are immutable here.
  if (editId && (!existing?.data || existing.data.status === 'published')) {
    redirect(returnTo);
  }

  const errorRaw = searchParams?.error;
  const errorCode =
    typeof errorRaw === 'string'
      ? errorRaw
      : Array.isArray(errorRaw)
        ? errorRaw[0]
        : null;

  const isEditing = Boolean(editId && existing?.data);

  const existingImages: ReleaseImageAsset[] = [];
  if (editId && existing?.data) {
    const { data: assetRows } = await session.supabase
      .from('press_assets')
      .select('id, file_name, file_url, file_size_bytes')
      .eq('press_release_id', editId)
      .eq('brand_id', session.brand.id)
      .eq('file_type', 'image')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    for (const row of assetRows ?? []) {
      if (row?.id && row.file_name && row.file_url) {
        existingImages.push(
          releaseImageFromRow({
            id: row.id,
            file_name: row.file_name,
            file_url: row.file_url,
            file_size_bytes: row.file_size_bytes,
          })
        );
      }
    }
  }

  const savedNotice = first(searchParams?.saved) === 'true';

  const form = (
    <NewReleaseForm
      brandId={session.brand.id}
      errorCode={errorCode}
      maxPendingImages={maxPendingImages}
      savedNotice={savedNotice}
      initialImages={existingImages}
      returnTo={returnTo}
      existing={
        editId && existing?.data
          ? {
              id: existing.data.id,
              title: existing.data.title ?? '',
              summary: existing.data.summary ?? null,
              imageLink:
                typeof existing.data.image_link === 'string'
                  ? existing.data.image_link
                  : null,
              bodyHtml: existing.data.body ?? '',
              industry_vertical: existing.data.industry_vertical ?? null,
              tags: Array.isArray(existing.data.tags) ? existing.data.tags : [],
            }
          : null
      }
      publishConfig={
        isEditing
          ? {
              plan,
              embargoUntil: (existing?.data as { embargo_until?: string | null })
                ?.embargo_until ?? null,
            }
          : null
      }
    />
  );

  const header = (
    <div className="mb-8">
      <h1 className="text-xl font-semibold text-brand-ink">
        {editId ? 'Edit press release' : 'New press release'}
      </h1>
      <p className="mt-1 text-sm text-brand-muted">
        {editId
          ? 'Update your draft and attach press images below, then publish when ready.'
          : 'Create a draft release first, then upload assets in Media Library.'}
      </p>
    </div>
  );

  if (isEditing && existing?.data) {
    return (
      <main className="bb-dash-main">
        <div className="bb-dash-inner">
          {header}

          <div className="bb-dash-split">
            <div>
              {form}
            </div>

            <ReleaseAiReadinessPanel
              releaseId={existing.data.id}
              initialScore={(existing.data as any).ai_readiness_score ?? null}
              plan={plan}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner max-w-3xl">
        {header}
        {form}
      </div>
    </main>
  );
}


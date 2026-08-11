import { z } from 'zod';
import { recordReleaseView } from '@/lib/analytics/record-release-view';
import { createClient } from '@/lib/supabase/server';

const BodySchema = z.object({
  pressReleaseId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.user_type !== 'journalist') {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  const { data: release } = await supabase
    .from('press_releases')
    .select('id, brand_id, status, deleted_at')
    .eq('id', parsed.data.pressReleaseId)
    .maybeSingle();

  if (
    !release?.brand_id ||
    release.status !== 'published' ||
    release.deleted_at
  ) {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  await recordReleaseView({
    supabase,
    journalistId: user.id,
    pressReleaseId: release.id,
    brandId: release.brand_id,
  });

  return Response.json({ ok: true });
}

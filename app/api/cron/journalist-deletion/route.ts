import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function runJournalistDeletionCron() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: dueRows, error: queryError } = await admin
    .from('journalist_profiles')
    .select('id')
    .eq('is_inactive', true)
    .not('scheduled_deletion_at', 'is', null)
    .lte('scheduled_deletion_at', now);

  if (queryError) {
    console.error('[cron/journalist-deletion] query failed', queryError);
    throw new Error(queryError.message);
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const row of dueRows ?? []) {
    const journalistId = row.id as string;
    const { error } = await admin.auth.admin.deleteUser(journalistId);
    if (error) {
      errors.push(`${journalistId}: ${error.message}`);
      continue;
    }
    deleted += 1;
  }

  if (errors.length > 0) {
    console.error('[cron/journalist-deletion] partial failures', errors);
  }

  return { deleted, failed: errors.length };
}

async function handleCron(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runJournalistDeletionCron();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Vercel Cron invokes GET. */
export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

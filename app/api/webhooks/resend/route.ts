import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveAuthUserByEmail } from '@/lib/auth/resolve-user-by-email';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  handleJournalistHardBounce,
  isHardBounceEvent,
  recipientEmailsFromBounce,
  type ResendBouncePayload,
} from '@/lib/journalist/handle-hard-bounce';
import { verifySvixWebhook } from '@/lib/webhooks/verify-svix';

export const runtime = 'nodejs';

async function resolveJournalistIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const user = await resolveAuthUserByEmail(admin, email);
  if (!user) return null;

  const userId = user.id;
  const { data: profile } = await admin
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.user_type !== 'journalist') return null;
  return userId;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Resend webhook is not configured.' },
      { status: 503 }
    );
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const body = await req.text();
  const headerStore = await headers();

  const verified = verifySvixWebhook(
    body,
    {
      id: headerStore.get('svix-id'),
      timestamp: headerStore.get('svix-timestamp'),
      signature: headerStore.get('svix-signature'),
    },
    webhookSecret
  );

  if (!verified) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let payload: ResendBouncePayload & { created_at?: string };
  try {
    payload = JSON.parse(body) as ResendBouncePayload & { created_at?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventId =
    headerStore.get('svix-id') ??
    `${payload.type ?? 'unknown'}:${payload.data?.to?.join(',') ?? ''}:${payload.created_at ?? ''}`;

  const { error: insertEventError } = await admin
    .from('resend_webhook_events')
    .insert({ event_id: eventId });

  if (insertEventError) {
    const msg = insertEventError.message.toLowerCase();
    const isDup =
      insertEventError.code === '23505' ||
      msg.includes('duplicate') ||
      msg.includes('unique');
    if (isDup) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: insertEventError.message }, { status: 500 });
  }

  try {
    if (!isHardBounceEvent(payload)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const emails = recipientEmailsFromBounce(payload);
    for (const email of emails) {
      const journalistId = await resolveJournalistIdByEmail(admin, email);
      if (!journalistId) continue;

      const result = await handleJournalistHardBounce(admin, {
        journalistId,
        email,
        eventPayload: payload,
      });

      if (result.slug) {
        revalidatePath(`/journalist/${result.slug}`);
      }
    }
  } catch (err) {
    await admin.from('resend_webhook_events').delete().eq('event_id', eventId);
    console.error('Resend webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from 'next/server';
import { dashboardPathForUserType } from '@/lib/auth/redirects';
import { isEmailConfirmed } from '@/lib/auth/email-confirmed';
import { provisionTrialBrandForUser } from '@/lib/auth/provision-trial-brand';
import { createClient } from '@/lib/supabase/server';
import type { UserType } from '@/types';

function parseUserType(metadata: Record<string, unknown>): UserType {
  const raw = metadata.user_type;
  return typeof raw === 'string' && raw.toLowerCase() === 'journalist'
    ? 'journalist'
    : 'brand';
}

function parseWantsTrial(metadata: Record<string, unknown>): boolean {
  const raw = metadata.wants_trial;
  return raw === true || raw === 'true';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', error);
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isEmailConfirmed(user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=email_not_confirmed`);
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const userType = parseUserType(metadata);
  const wantsTrial = parseWantsTrial(metadata);
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : null;

  if (userType === 'brand' && wantsTrial) {
    await provisionTrialBrandForUser(user.id, fullName);
    return NextResponse.redirect(`${origin}/brand/upload?trial=true`);
  }

  return NextResponse.redirect(`${origin}${dashboardPathForUserType(userType)}`);
}

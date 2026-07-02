'use server';

import { SESSION_ONLY_AUTH_COOKIE } from '@/lib/auth/remember-me';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_ONLY_AUTH_COOKIE);
  redirect('/login');
}

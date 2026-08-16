import type { ReactNode } from 'react';
import { AuthEnvWarning } from '@/components/auth/auth-env-warning';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export default function LoginLayout({ children }: { children: ReactNode }) {
  const env = getSupabasePublicEnv();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-raised p-6">
      <div className="w-full max-w-md rounded-card border border-border-default bg-surface-page p-8 shadow-sm">
        {!env ? <AuthEnvWarning /> : null}
        {children}
      </div>
    </div>
  );
}

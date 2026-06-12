import Image from 'next/image';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';
import { SignupHero } from '@/components/auth/SignupHero';
import { AuthEnvWarning } from '@/components/auth/auth-env-warning';
import { betaInviteCode } from '@/lib/config/beta';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { APP_NAME, TRIAL_COPY } from '@/constants/copy';

type SignupPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  const trial = first(searchParams.trial) === 'true';
  const env = getSupabasePublicEnv();

  return (
    <main className="flex min-h-screen w-full bg-neutral-50 p-2 transition-all duration-500 selection:bg-accent/20 lg:h-screen lg:overflow-hidden lg:p-4">
      <SignupHero />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 sm:px-16 lg:overflow-hidden lg:px-20 lg:py-8 xl:px-32">
        <div className="w-full max-w-lg space-y-6 sm:space-y-7 lg:space-y-5">
          <div className="flex w-full flex-col gap-4 lg:hidden">
            <Link
              href="/"
              className="self-start text-sm font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              Back to home
            </Link>
            <Link href="/" className="inline-flex">
              <Image
                src="/broadbase-logo.png"
                alt={APP_NAME}
                width={141}
                height={25}
                className="h-7 w-auto"
                priority
              />
            </Link>
          </div>

          {!env ? <AuthEnvWarning /> : null}

          <div className="space-y-1.5">
            <p className="text-2xl font-semibold tracking-tight text-text-primary">
              Create account
            </p>
            <p className="text-sm text-text-secondary">
              Brands distribute releases; journalists discover and save them.
            </p>
          </div>

          {trial ? (
            <p className="rounded-xl bg-accent-subtle px-4 py-3 text-sm text-accent-hover">
              {TRIAL_COPY.signupBanner}
            </p>
          ) : null}

          <SignupForm inviteRequired={Boolean(betaInviteCode)} />

          <p className="text-center text-xs text-text-secondary">
            By signing up you agree to{' '}
            <Link href="https://broadbase.app/terms" className="text-accent underline">
              our Terms & Conditions
            </Link>{' '}
            and confirm the account type you select is accurate.
          </p>

        </div>
      </div>
    </main>
  );
}

import Image from 'next/image';
import { redirect } from 'next/navigation';
import { BetaAccessForm } from '@/components/auth/BetaAccessForm';
import { BetaWaitlistForm } from '@/components/auth/BetaWaitlistForm';
import { SIGNUP_HERO_GRADIENT } from '@/components/home/feature-card-gradients';
import { APP_NAME } from '@/constants/copy';
import { betaSitePassword, sanitizeBetaNextParam } from '@/lib/config/beta';

type BetaAccessPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default function BetaAccessPage({ searchParams }: BetaAccessPageProps) {
  if (!betaSitePassword) {
    redirect('/');
  }

  const nextPath = sanitizeBetaNextParam(first(searchParams.next));

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10"
      style={{ background: SIGNUP_HERO_GRADIENT }}
    >
      <Image
        src="/broadbase-logo.png"
        alt={APP_NAME}
        width={180}
        height={32}
        className="h-8 w-auto"
        priority
      />

      <div className="w-full max-w-md space-y-3 text-center">
        <h1 className="font-heading text-2xl font-normal tracking-tight text-brand-ink md:text-3xl">
          Welcome to the end of the unsolicited pitch.
        </h1>
        <p className="text-base text-brand-ink/90">
          We&apos;re working on something big. Sign up to learn more. We&apos;ll let you know the
          moment it&apos;s ready.
        </p>
      </div>

      <div className="w-full max-w-md">
        <BetaWaitlistForm />
      </div>

      <div className="flex w-full max-w-md items-center gap-4">
        <div className="h-px flex-1 bg-brand-ink/20" />
        <span className="text-xs font-medium uppercase tracking-wide text-brand-ink/70">
          Beta access
        </span>
        <div className="h-px flex-1 bg-brand-ink/20" />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white/60 p-6 backdrop-blur-sm">
        <BetaAccessForm nextPath={nextPath} />
      </div>
    </main>
  );
}

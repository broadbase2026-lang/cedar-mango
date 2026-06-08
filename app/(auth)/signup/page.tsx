import Image from 'next/image';
import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';
import { betaInviteCode } from '@/lib/config/beta';
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

  return (
    <>
      <Link href="/" className="mx-auto flex justify-center">
        <Image
          src="/broadbase-logo.png"
          alt={APP_NAME}
          width={141}
          height={25}
          className="h-7 w-auto"
          priority
        />
      </Link>
      <h1 className="mt-2 text-center text-xl font-semibold text-neutral-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">
        Brands distribute releases; journalists discover and save them.
      </p>
      {trial ? (
        <p className="mt-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {TRIAL_COPY.signupBanner}
        </p>
      ) : null}
      <div className="mt-8">
        <SignupForm inviteRequired={Boolean(betaInviteCode)} />
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        By signing up you agree to{' '}
        <Link href="https://broadbase.app/terms" className="text-teal-700 underline">
          our Terms & Conditions
        </Link>{' '}
        and confirm the account type you select is accurate.
      </p>
      <p className="mt-2 text-center text-xs">
        <Link href="/" className="text-teal-700 underline">
          Back to home
        </Link>
      </p>
    </>
  );
}

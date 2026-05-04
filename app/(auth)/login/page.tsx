import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { APP_NAME } from '@/constants/copy';
import { sanitizeInternalNextParam } from '@/lib/auth/redirects';

type LoginPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const raw = searchParams?.next;
  const nextRaw = Array.isArray(raw) ? raw[0] : raw;
  const nextPath = sanitizeInternalNextParam(nextRaw ?? null);

  return (
    <>
      <p className="text-center text-xs font-medium uppercase tracking-wide text-teal-700">
        {APP_NAME}
      </p>
      <h1 className="mt-2 text-center text-xl font-semibold text-neutral-900">Log in</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">
        Use the email and password for your brand or journalist account.
      </p>
      <div className="mt-8">
        <LoginForm nextPath={nextPath} />
      </div>
      <p className="mt-6 text-center text-xs">
        <Link href="/" className="text-teal-700 underline">
          Back to home
        </Link>
      </p>
    </>
  );
}

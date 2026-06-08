import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { APP_NAME } from '@/constants/copy';
import { sanitizeInternalNextParam } from '@/lib/auth/redirects';

const LOGIN_CALLBACK_ERRORS: Record<string, string> = {
  auth_callback: 'Could not complete sign-in from your email link. Try logging in instead.',
  email_not_confirmed:
    'Your email is not confirmed yet. Check your inbox for the confirmation link.',
  missing_code: 'Invalid sign-in link. Try logging in with your email and password.',
};

type LoginPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const raw = searchParams?.next;
  const nextRaw = Array.isArray(raw) ? raw[0] : raw;
  const nextPath = sanitizeInternalNextParam(nextRaw ?? null);
  const errorRaw = searchParams?.error;
  const errorKey = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;
  const callbackError =
    typeof errorKey === 'string' ? LOGIN_CALLBACK_ERRORS[errorKey] ?? null : null;

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
        <LoginForm nextPath={nextPath} callbackError={callbackError} />
      </div>
      <p className="mt-6 text-center text-xs">
        <Link href="/" className="text-teal-700 underline">
          Back to home
        </Link>
      </p>
    </>
  );
}

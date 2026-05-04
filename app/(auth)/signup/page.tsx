import Link from 'next/link';
import { SignupForm } from '@/components/auth/SignupForm';
import { APP_NAME } from '@/constants/copy';

export default function SignupPage() {
  return (
    <>
      <p className="text-center text-xs font-medium uppercase tracking-wide text-teal-700">
        {APP_NAME}
      </p>
      <h1 className="mt-2 text-center text-xl font-semibold text-neutral-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-neutral-600">
        Brands distribute releases; journalists discover and save them.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        By signing up you agree to our terms and confirm the account type you select is accurate.
      </p>
      <p className="mt-2 text-center text-xs">
        <Link href="/" className="text-teal-700 underline">
          Back to home
        </Link>
      </p>
    </>
  );
}

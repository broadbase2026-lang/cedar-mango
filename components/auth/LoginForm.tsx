'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { loginAction, type AuthActionState } from '@/app/(auth)/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
    >
      {pending ? 'Signing in…' : 'Log in'}
    </button>
  );
}

type LoginFormProps = {
  nextPath: string | null;
  callbackError?: string | null;
};

export function LoginForm({ nextPath, callbackError }: LoginFormProps) {
  const initialState: AuthActionState = { error: null };
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-teal-700 focus:border-teal-700 focus:ring-1"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-neutral-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-teal-700 focus:border-teal-700 focus:ring-1"
        />
      </div>

      {callbackError ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {callbackError}
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-sm text-neutral-600">
        New here?{' '}
        <Link href="/signup" className="font-medium text-teal-700 underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

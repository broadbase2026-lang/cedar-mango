'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signupAction, type AuthActionState } from '@/app/(auth)/actions';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
    >
      {pending ? 'Please wait…' : label}
    </button>
  );
}

export function SignupForm(props: { inviteRequired?: boolean }) {
  const inviteRequired = props.inviteRequired ?? false;
  const initialState: AuthActionState = { error: null };
  const [state, formAction] = useFormState(signupAction, initialState);
  const searchParams = useSearchParams();
  const trial = (searchParams?.get('trial') ?? '') === 'true';

  if (state.needsEmailConfirmation) {
    return (
      <div className="rounded-md bg-teal-50 px-4 py-3 text-sm text-teal-900">
        <p className="font-medium">Check your email</p>
        <p className="mt-1">
          We sent a confirmation link to your address. After you confirm, you can{' '}
          <Link href="/login" className="font-medium underline">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="trial" value={trial ? 'true' : 'false'} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-neutral-800">Account type</legend>
        <p className="text-xs text-neutral-500">
          This cannot be changed later — pick the role that matches how you will use Broadbase.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50">
            <input
              type="radio"
              name="user_type"
              value="brand"
              defaultChecked
              required
              className="text-teal-700"
            />
            <span className="text-sm text-neutral-800">Brand</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-3 py-2 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-50">
            <input
              type="radio"
              name="user_type"
              value="journalist"
              required
              className="text-teal-700"
            />
            <span className="text-sm text-neutral-800">Journalist</span>
          </label>
        </div>
      </fieldset>

      {inviteRequired ? (
        <div className="space-y-1.5">
          <label htmlFor="invite_code" className="text-sm font-medium text-neutral-800">
            Invite code
          </label>
          <input
            id="invite_code"
            name="invite_code"
            type="text"
            autoComplete="off"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-teal-700 focus:border-teal-700 focus:ring-1"
            placeholder="Enter your beta invite code"
          />
          <p className="text-xs text-neutral-500">
            Broadbase is invite-only during the beta. Contact us if you need access.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="full_name" className="text-sm font-medium text-neutral-800">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-teal-700 focus:border-teal-700 focus:ring-1"
          placeholder="Jane Lee"
        />
      </div>

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
          autoComplete="new-password"
          required
          minLength={6}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-teal-700 focus:border-teal-700 focus:ring-1"
        />
        <p className="text-xs text-neutral-500">At least 6 characters (Supabase minimum).</p>
      </div>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.needsEmailConfirmation ? null : (
        <>
          <SubmitButton label="Create account" />

          <p className="text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-teal-700 underline">
              Log in
            </Link>
          </p>
        </>
      )}
    </form>
  );
}

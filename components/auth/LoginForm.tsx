'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { loginAction, type AuthActionState } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" loading={pending} className="w-full">
      {pending ? 'Signing in…' : 'Log in'}
    </Button>
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
    <form action={formAction} className="flex flex-col gap-4">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-10"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          id="remember_me"
          name="remember_me"
          type="checkbox"
          value="true"
          defaultChecked
          className="h-4 w-4 rounded-control border-border-default accent-accent"
        />
        <span className="text-sm text-text-secondary">Remember me</span>
      </label>

      {callbackError ? (
        <p
          className="rounded-control bg-warning-subtle px-3 py-2 text-sm text-warning"
          role="alert"
        >
          {callbackError}
        </p>
      ) : null}

      {state.error ? (
        <p
          className="rounded-control bg-error-subtle px-3 py-2 text-sm text-error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-sm text-text-secondary">
        New here?{' '}
        <Link href="/signup" className="font-medium text-accent underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

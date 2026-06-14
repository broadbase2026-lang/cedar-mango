'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { betaAccessAction, type BetaAccessActionState } from '@/app/beta-access/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="md" className="mt-1 w-full rounded-xl">
      {pending ? 'Please wait…' : 'Continue'}
    </Button>
  );
}

type BetaAccessFormProps = {
  nextPath: string;
};

export function BetaAccessForm({ nextPath }: BetaAccessFormProps) {
  const initialState: BetaAccessActionState = { error: null };
  const [state, formAction] = useFormState(betaAccessAction, initialState);
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-primary">
          Beta password
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Enter the beta password"
            className="h-10 pr-11"
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-text-secondary">
          Broadbase is in private beta. Contact us if you need access.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-xl bg-error-subtle px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

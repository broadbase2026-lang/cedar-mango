'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { signupAction, type AuthActionState } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="md" className="mt-1 w-full rounded-xl">
      {pending ? 'Please wait…' : label}
    </Button>
  );
}

function InputGroup({
  label,
  id,
  name,
  placeholder,
  type = 'text',
  autoComplete,
  required = true,
  minLength,
  helperText,
  showPasswordToggle = false,
}: {
  label: string;
  id: string;
  name: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  helperText?: string;
  showPasswordToggle?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPasswordToggle && visible ? 'text' : type;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className={isPassword && showPasswordToggle ? 'relative' : undefined}>
        <Input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={cn('h-10', isPassword && showPasswordToggle && 'pr-11')}
        />
        {isPassword && showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {helperText ? <p className="text-xs text-text-secondary">{helperText}</p> : null}
    </div>
  );
}

export function SignupForm(props: { inviteRequired?: boolean }) {
  const inviteRequired = props.inviteRequired ?? false;
  const initialState: AuthActionState = { error: null };
  const [state, formAction] = useFormState(signupAction, initialState);
  const searchParams = useSearchParams();
  const trial = (searchParams?.get('trial') ?? '') === 'true';
  const reduceMotion = useReducedMotion();

  if (state.needsEmailConfirmation) {
    return (
      <div className="rounded-xl bg-accent-subtle px-4 py-3 text-sm text-accent-hover">
        <p className="font-medium">Check your email</p>
        <p className="mt-1">
          We sent a confirmation link to your address. After you confirm, you can{' '}
          <Link href="/login" className="font-medium text-accent underline">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="trial" value={trial ? 'true' : 'false'} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-text-primary">Account type</legend>
          <p className="text-xs text-text-secondary">
            This cannot be changed later — pick the role that matches how you will use
            Broadbase.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-default px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-subtle">
              <input
                type="radio"
                name="user_type"
                value="brand"
                defaultChecked
                required
                className="text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">Brand</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-default px-3 py-2.5 has-[:checked]:border-accent has-[:checked]:bg-accent-subtle">
              <input
                type="radio"
                name="user_type"
                value="journalist"
                required
                className="text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-primary">Journalist</span>
            </label>
          </div>
        </fieldset>

        {inviteRequired ? (
          <InputGroup
            label="Invite code"
            id="invite_code"
            name="invite_code"
            autoComplete="off"
            placeholder="Enter your beta invite code"
            helperText="Broadbase is invite-only during the beta. Contact us if you need access."
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputGroup
            label="Full name"
            id="full_name"
            name="full_name"
            autoComplete="name"
            placeholder="Jane Lee"
          />

          <InputGroup
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
          />
        </div>

        <InputGroup
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          helperText="At least 6 characters (Supabase minimum)."
          showPasswordToggle
        />

        <InputGroup
          label="Verify password"
          id="password_verify"
          name="password_verify"
          type="password"
          autoComplete="new-password"
          minLength={6}
          showPasswordToggle
        />

        {state.error ? (
          <p className="rounded-xl bg-error-subtle px-3 py-2 text-sm text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}

        <SubmitButton label="Create account" />

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent underline">
            Log in
          </Link>
        </p>
      </form>
    </motion.div>
  );
}

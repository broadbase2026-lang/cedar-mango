'use client';

import { useState } from 'react';
import { createCheckoutSession, startFreeTrial, type PricingPlan } from './actions';
import { UI_COPY } from '@/constants/copy';

export function PlanCheckoutButton(props: {
  plan: PricingPlan;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = Boolean(props.disabled) || isLoading;

  return (
    <div>
      <button
        type="button"
        className={[
          'w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'ring-offset-white',
          disabled
            ? 'cursor-not-allowed bg-neutral-200 text-neutral-600'
            : 'bg-[#1D9E75] text-white hover:bg-[#178c68] focus-visible:ring-[#1D9E75]',
        ].join(' ')}
        disabled={disabled}
        title={props.title}
        onClick={async () => {
          setIsLoading(true);
          setError(null);
          try {
            const result = await createCheckoutSession(props.plan);
            if (!result.success) {
              setError(result.error);
              return;
            }
            window.location.assign(result.data.url);
          } catch {
            setError(UI_COPY.errors.genericTryAgain);
          } finally {
            setIsLoading(false);
          }
        }}
      >
        {isLoading ? UI_COPY.loading.redirecting : props.label}
      </button>

      {error ? (
        <div className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function StartTrialButton(props: { label: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        className={[
          'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'ring-offset-white',
          isLoading
            ? 'cursor-wait bg-[#1D9E75]/80 text-white'
            : 'bg-[#1D9E75] text-white hover:bg-[#178c68] focus-visible:ring-[#1D9E75]',
        ].join(' ')}
        disabled={isLoading}
        onClick={async () => {
          setIsLoading(true);
          setError(null);
          try {
            const res = await startFreeTrial();
            if (!res.success) {
              setError(res.error);
              return;
            }
            window.location.assign(res.data.redirectTo);
          } catch {
            setError(UI_COPY.errors.genericTryAgain);
          } finally {
            setIsLoading(false);
          }
        }}
      >
        {isLoading ? UI_COPY.loading.starting : props.label}
      </button>
      {error ? (
        <div className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}


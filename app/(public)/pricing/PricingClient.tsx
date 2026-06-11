'use client';

import { useState } from 'react';
import { createCheckoutSession, startFreeTrial, type PricingPlan } from './actions';
import { UI_COPY } from '@/constants/copy';
import {
  pricingAccentCtaClass,
  pricingAccentCtaInlineClass,
} from './pricing-cta-styles';

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
          pricingAccentCtaClass,
          disabled ? 'cursor-not-allowed opacity-50' : '',
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
          pricingAccentCtaInlineClass,
          isLoading ? 'cursor-wait opacity-80' : '',
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

import { buttonClassName } from '@/components/ui/button';

export const pricingAccentCtaClass = buttonClassName({
  variant: 'accent',
  size: 'md',
  className: 'w-full',
});

export const pricingAccentCtaInlineClass = buttonClassName({
  variant: 'accent',
  size: 'sm',
});

export const pricingDisabledCtaClass =
  'inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-lg bg-neutral-200 px-4 text-sm font-semibold text-text-secondary';

export const pricingDisabledCtaInlineClass =
  'inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg bg-neutral-200 px-4 text-sm font-semibold text-text-secondary';

import * as React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-base text-text-primary shadow-media-soft hover:bg-primary-hover active:bg-primary-active',
  accent:
    'bg-accent text-text-inverse shadow-media-soft hover:bg-accent-hover',
  ghost:
    'border border-border-default bg-transparent text-text-primary hover:bg-surface-overlay',
  destructive: 'bg-error text-text-inverse shadow-media-soft hover:bg-red-600',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonClassName({
  variant = 'accent',
  size = 'md',
  className,
}: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'accent', size = 'md', type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={buttonClassName({ variant, size, className })}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export type ButtonLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  'className'
> &
  ButtonStyleProps;

export function ButtonLink({
  className,
  variant = 'accent',
  size = 'md',
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}

import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl bg-white px-4 text-sm text-brand-ink ' +
            'ring-1 ring-inset ring-brand-border shadow-sm ' +
            'placeholder:text-brand-muted/80 ' +
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ' +
            'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';


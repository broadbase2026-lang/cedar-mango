import * as React from 'react';

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex w-full rounded-control border border-border-default bg-surface-page px-4 py-3 text-sm text-text-primary shadow-sm ' +
            'placeholder:text-text-disabled ' +
            'aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error ' +
            'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
            'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

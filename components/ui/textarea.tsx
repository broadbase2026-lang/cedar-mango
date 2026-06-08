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
          'flex w-full rounded-lg border border-border-default bg-surface-page px-4 py-3 text-sm text-text-primary shadow-sm ' +
            'placeholder:text-text-disabled ' +
            'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent ' +
            'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';

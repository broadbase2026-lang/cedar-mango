import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

const fieldStates =
  'aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error ' +
  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          type === 'file'
            ? 'flex h-11 w-full cursor-pointer rounded-control border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary shadow-sm ' +
              'file:mr-3 file:cursor-pointer file:rounded-control file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-text-primary ' +
              'hover:file:bg-surface-overlay ' +
              fieldStates +
              ' disabled:file:cursor-not-allowed'
            : 'flex h-11 w-full rounded-control border border-border-default bg-surface-page px-4 text-sm text-text-primary shadow-sm ' +
              'placeholder:text-text-disabled ' +
              fieldStates,
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

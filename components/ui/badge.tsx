import * as React from 'react';

export type BadgeStatus =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status: BadgeStatus;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

const statusClasses: Record<BadgeStatus, string> = {
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  error: 'bg-error-subtle text-error',
  info: 'bg-info-subtle text-info',
  neutral: 'bg-surface-overlay text-text-secondary',
  primary: 'bg-primary-subtle text-text-primary',
};

export function Badge({ className, status, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusClasses[status],
        className
      )}
      {...props}
    />
  );
}

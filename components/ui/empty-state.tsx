import type { ReactNode } from 'react';

type EmptyStateProps = {
  heading: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function EmptyState({
  heading,
  body,
  action,
  icon,
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="px-1 py-6 text-center">
        {icon ? (
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-control bg-surface-overlay text-brand-muted">
            {icon}
          </div>
        ) : null}
        <p className="text-sm font-medium text-brand-ink">{heading}</p>
        {body ? <p className="mt-1 text-sm text-brand-muted">{body}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className="bb-dash-empty-nobrand-inner">
      {icon ? <div className="bb-dash-empty-icon">{icon}</div> : null}
      <h3 className="bb-dash-empty-heading">{heading}</h3>
      {body ? <p className="bb-dash-empty-text">{body}</p> : null}
      {action ? <div className={cn('bb-dash-empty-cta', !icon && 'mt-4')}>{action}</div> : null}
    </div>
  );
}

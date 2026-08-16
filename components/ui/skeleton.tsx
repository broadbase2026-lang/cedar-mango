function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-card bg-brand-surface-2', className)}
      aria-hidden
    />
  );
}

export function PortalLoadingSkeleton() {
  return (
    <div className="bb-dash-main" aria-busy="true" aria-label="Loading">
      <div className="bb-dash-inner space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}

export function DiscoverFeedSkeleton() {
  return (
    <div
      className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4"
      aria-busy="true"
      aria-label="Loading releases"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton
          key={index}
          className="mb-4 h-64 w-full break-inside-avoid"
        />
      ))}
    </div>
  );
}

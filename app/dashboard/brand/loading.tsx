export default function DashboardBrandLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
      <div
        className="h-9 w-9 animate-pulse rounded-full bg-brand-border/90"
        aria-hidden
      />
      <p className="text-sm text-brand-muted">Loading…</p>
    </div>
  );
}

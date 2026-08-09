import { sanitizeInternalNextParam } from '@/lib/auth/redirects';

export const DEFAULT_RELEASES_LIST_HREF = '/brand/dashboard?section=releases';

/** Safe dashboard/list path to return to after leaving the release editor. */
export function resolveReleaseEditorReturnTo(
  raw: string | null | undefined
): string {
  return sanitizeInternalNextParam(raw ?? null) ?? DEFAULT_RELEASES_LIST_HREF;
}

/** Build `/brand/releases/new?edit=…` with optional return path and flags. */
export function editReleaseHref(
  releaseId: string,
  opts?: {
    next?: string | null;
    saved?: boolean;
    error?: string;
  }
): string {
  const params = new URLSearchParams();
  params.set('edit', releaseId);
  if (opts?.saved) params.set('saved', 'true');
  if (opts?.error) params.set('error', opts.error);
  const next = sanitizeInternalNextParam(opts?.next ?? null);
  if (next) params.set('next', next);
  return `/brand/releases/new?${params.toString()}`;
}

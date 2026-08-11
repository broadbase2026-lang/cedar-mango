import { ERROR_MESSAGES, TRIAL_LIMIT_COPY } from '@/constants/copy';

/** Map publish API error codes to user-facing copy. */
export function publishApiErrorMessage(
  code: string | null | undefined
): string {
  if (!code) return 'Publish failed. Try again.';

  switch (code) {
    case 'unauthenticated':
      return 'Sign in to publish this release.';
    case 'invalid_json':
    case 'invalid_request':
      return 'Invalid request. Refresh the page and try again.';
    case 'not_found':
      return 'This release could not be found.';
    case 'forbidden':
      return 'You do not have permission to publish this release.';
    case 'server_misconfigured':
      return 'Publishing is temporarily unavailable. Try again later.';
    case ERROR_MESSAGES.publishLimitReached:
    case 'publish_limit_reached':
      return ERROR_MESSAGES.publishLimitReached;
    case ERROR_MESSAGES.embargoNotAvailable:
      return ERROR_MESSAGES.embargoNotAvailable;
    case ERROR_MESSAGES.embargoDateMustBeFuture:
      return ERROR_MESSAGES.embargoDateMustBeFuture;
    case ERROR_MESSAGES.publishedAtMustBePastOrNow:
      return ERROR_MESSAGES.publishedAtMustBePastOrNow;
    case TRIAL_LIMIT_COPY.errors.releaseLimit:
      return TRIAL_LIMIT_COPY.errors.releaseLimit;
    case 'Only draft releases can be published.':
      return 'Only draft releases can be published.';
    case 'You need an active subscription to publish.':
      return 'You need an active subscription to publish.';
    default:
      if (code.includes(' ') || code.length > 48) return code;
      return 'Publish failed. Try again.';
  }
}

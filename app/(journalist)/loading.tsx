/** Instant shell while RSC resolves — avoids a blank main area during sidebar navigation. */
import { PortalLoadingSkeleton } from '@/components/ui/skeleton';

export default function JournalistRouteLoading() {
  return <PortalLoadingSkeleton />;
}

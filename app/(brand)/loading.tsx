/** Instant shell while RSC resolves — avoids a blank main area during fast sidebar clicks. */
import { PortalLoadingSkeleton } from '@/components/ui/skeleton';

export default function BrandRouteLoading() {
  return <PortalLoadingSkeleton />;
}

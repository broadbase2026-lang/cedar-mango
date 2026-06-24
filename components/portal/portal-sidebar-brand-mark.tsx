import Image from 'next/image';
import Link from 'next/link';
import { APP_NAME } from '@/constants/copy';

type PortalSidebarBrandMarkProps = {
  portalLabel: string;
  homeHref: string;
};

export function PortalSidebarBrandMark({
  portalLabel,
  homeHref,
}: PortalSidebarBrandMarkProps) {
  return (
    <div className="bb-portal-sidebar-brand-text min-w-0">
      <Link
        href={homeHref}
        className="inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Image
          src="/favicon.png"
          alt={APP_NAME}
          width={32}
          height={32}
          className="bb-portal-sidebar-logo"
          priority
        />
      </Link>
      <div className="bb-portal-sidebar-title">{portalLabel}</div>
    </div>
  );
}

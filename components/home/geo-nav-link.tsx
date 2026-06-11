'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GEO_PAGE } from '@/constants/copy';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function GeoNavLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const isActive = pathname === '/geo';

  return (
    <Link
      href="/geo"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'bb-nav-link',
        isActive && 'bb-nav-link--active',
        className,
      )}
    >
      {GEO_PAGE.NAV_LABEL}
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GEO_PAGE } from '@/constants/copy';

export function GeoNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/geo';

  return (
    <Link
      href="/geo"
      aria-current={isActive ? 'page' : undefined}
      className={[
        'text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface',
        isActive
          ? 'text-accent underline underline-offset-4'
          : 'text-brand-muted hover:text-brand-ink',
      ].join(' ')}
    >
      {GEO_PAGE.NAV_LABEL}
    </Link>
  );
}

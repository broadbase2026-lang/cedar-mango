'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function PricingNavLink() {
  const pathname = usePathname();
  const isActive = pathname === '/pricing';

  return (
    <Link
      href="/pricing"
      aria-current={isActive ? 'page' : undefined}
      className={[
        'text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface',
        isActive
          ? 'text-[#1D9E75] underline underline-offset-4'
          : 'text-brand-muted hover:text-brand-ink',
      ].join(' ')}
    >
      Pricing
    </Link>
  );
}


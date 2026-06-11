'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function PricingNavLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const isActive = pathname === '/pricing';

  return (
    <Link
      href="/pricing"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'bb-nav-link',
        isActive && 'bb-nav-link--active',
        className,
      )}
    >
      Pricing
    </Link>
  );
}

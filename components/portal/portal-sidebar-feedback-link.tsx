'use client';

import Link from 'next/link';
import { MessageSquare, type LucideIcon } from 'lucide-react';

function NavItemIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="bb-portal-nav-link-icon" aria-hidden>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

type PortalSidebarFeedbackLinkProps = {
  href: string;
  active?: boolean;
  onNavigate?: () => void;
};

export function PortalSidebarFeedbackLink({
  href,
  active = false,
  onNavigate,
}: PortalSidebarFeedbackLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={
        'bb-portal-nav-link ' + (active ? 'bb-portal-nav-link--active' : '')
      }
    >
      <NavItemIcon icon={MessageSquare} />
      <span className="bb-portal-nav-link-label">Feedback</span>
    </Link>
  );
}

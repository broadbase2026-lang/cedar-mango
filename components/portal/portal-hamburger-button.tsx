'use client';

import { Menu, X } from 'lucide-react';

type PortalHamburgerButtonProps = {
  open: boolean;
  onToggle: () => void;
  controlsId: string;
};

export function PortalHamburgerButton({
  open,
  onToggle,
  controlsId,
}: PortalHamburgerButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-brand-ink transition-colors hover:bg-brand-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:hidden"
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={open ? 'Close menu' : 'Open menu'}
      onClick={onToggle}
    >
      {open ? (
        <X size={22} strokeWidth={2} aria-hidden />
      ) : (
        <Menu size={22} strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}

'use client';

import * as React from 'react';

export type ModalProps = {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  titleId?: string;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  children,
  className,
  onClose,
  titleId = 'bb-modal-title',
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const focusTarget =
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? closeRef.current;
    focusTarget?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.tabIndex !== -1 && !el.hasAttribute('disabled'));
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          'relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-card border border-border-default bg-surface-page shadow-lg',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {onClose ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-overlay hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-page"
          >
            <span aria-hidden>×</span>
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

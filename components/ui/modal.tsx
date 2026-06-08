import * as React from 'react';

export type ModalProps = {
  open: boolean;
  children: React.ReactNode;
  className?: string;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function Modal({ open, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4"
      role="presentation"
    >
      <div
        className={cn(
          'max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg border border-border-default bg-surface-page shadow-lg',
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

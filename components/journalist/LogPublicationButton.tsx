'use client';

import { useState } from 'react';
import { LogPublicationModal } from '@/components/journalist/LogPublicationModal';

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export type LogPublicationButtonProps = {
  pressReleaseId?: string;
  pressReleaseTitle?: string;
  publicationNameSuggestions?: string[];
  // Renders a non-functional placeholder (e.g. on the mock discover feed,
  // where releases have no real id to log against yet).
  disabled?: boolean;
  className?: string;
};

export function LogPublicationButton({
  pressReleaseId,
  pressReleaseTitle,
  publicationNameSuggestions,
  disabled = false,
  className,
}: LogPublicationButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={
          disabled
            ? 'Available once this feed shows live releases'
            : undefined
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setOpen(true);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary-700 hover:underline',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline disabled:hover:no-underline',
          className
        )}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        I published this
      </button>

      {!disabled ? (
        <LogPublicationModal
          isOpen={open}
          onClose={() => setOpen(false)}
          pressReleaseId={pressReleaseId}
          pressReleaseTitle={pressReleaseTitle}
          publicationNameSuggestions={publicationNameSuggestions}
        />
      ) : null}
    </>
  );
}

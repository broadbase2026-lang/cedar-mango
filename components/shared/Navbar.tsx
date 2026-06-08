'use client';

import Link from 'next/link';

/**
 * Top chrome using the unified teal backbone — identical on journalist and brand sides.
 */
export function Navbar() {
  return (
    <header className="bb-top-nav">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"
        aria-label="Main"
      >
        <Link
          href="/"
          className="border-b-2 border-accent pb-0.5 text-sm font-medium text-accent"
        >
          Home
        </Link>
        <Link
          href="/contact"
          className="text-sm font-medium text-neutral-400 hover:text-text-inverse"
        >
          Contact
        </Link>
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-text-inverse">
            BB
          </span>
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-hover"
          >
            Action
          </button>
        </div>
      </nav>
    </header>
  );
}

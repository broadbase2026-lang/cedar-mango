import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';
import { LegalDocument } from '@/components/legal/legal-document';
import {
  TERMS_HTML,
  TERMS_LAST_UPDATED,
  TERMS_SECTIONS,
} from '@/constants/terms-and-conditions';
import { APP_NAME } from '@/constants/copy';

export const metadata: Metadata = {
  title: `Terms and Conditions | ${APP_NAME}`,
  description: `Terms and Conditions governing use of the ${APP_NAME} platform.`,
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-brand-surface">
      <PublicSiteHeader />

      <section className="border-b border-brand-border bg-white">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-8 md:pt-14">
          <div className="inline-flex items-center rounded-full bg-brand-surface px-3 py-1 text-xs font-medium text-brand-muted ring-1 ring-inset ring-brand-border">
            Legal
          </div>
          <h1 className="mt-6 text-4xl font-normal tracking-tight text-brand-ink md:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mt-4 text-sm text-brand-muted">
            Last updated: {TERMS_LAST_UPDATED}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <nav aria-label="Table of contents" className="lg:sticky lg:top-24 lg:self-start">
            <details className="group lg:hidden">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-brand-muted [&::-webkit-details-marker]:hidden">
                Contents
              </summary>
              <ol className="mt-4 space-y-2 text-sm">
                {TERMS_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`#${section.id}`}
                      className="text-brand-muted transition-colors hover:text-brand-ink"
                    >
                      <span className="text-brand-muted/70">{section.number}.</span>{' '}
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </details>

            <div className="hidden lg:block">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Contents
              </h2>
              <ol className="mt-4 space-y-2 text-sm">
                {TERMS_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <Link
                      href={`#${section.id}`}
                      className="text-brand-muted transition-colors hover:text-brand-ink"
                    >
                      <span className="text-brand-muted/70">{section.number}.</span>{' '}
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-inset ring-brand-border shadow-media-soft md:p-10">
            <LegalDocument html={TERMS_HTML} />
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}

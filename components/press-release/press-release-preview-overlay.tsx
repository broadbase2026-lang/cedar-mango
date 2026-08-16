'use client';

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { RichTextRender } from '@/components/rich-text/rich-text-render';
import { stripLeadingTitleFromHtml } from '@/lib/rich-text/strip-leading-title';
import { useLenisScrollLock } from '@/components/smooth-scroll-provider';
import { EmptyState } from '@/components/ui/empty-state';

export type PressReleasePreviewContent = {
  title: string;
  verticalLabel: string | null;
  dateLabel: string | null;
  summary: string | null;
  imageLink?: string | null;
  body: string;
  bodyLoading: boolean;
  heroImageUrl: string | null;
  mediaAssets: { label: string; href: string }[];
  footerMeta?: string | null;
  fullReleaseHref?: string | null;
  fullReleaseLabel?: string;
};

type PressReleasePreviewOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: PressReleasePreviewContent | null;
};

export function verticalPreviewBadgeClass(label: string) {
  if (label === 'F&B') return 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-700/30';
  if (label === 'Travel') return 'bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-700/30';
  return 'bg-fuchsia-50 text-fuchsia-900 ring-1 ring-inset ring-fuchsia-700/30';
}

export function PressReleasePreviewOverlay({
  open,
  onOpenChange,
  content,
}: PressReleasePreviewOverlayProps) {
  useLenisScrollLock(open);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild onOpenAutoFocus={(e) => e.preventDefault()}>
              <motion.div
                data-lenis-prevent
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="fixed inset-y-0 right-0 z-50 flex h-dvh max-h-dvh w-full max-w-[520px] flex-col border-l border-brand-border bg-white shadow-media-soft"
              >
                <div className="shrink-0 border-b border-brand-border bg-white/90 p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {content?.verticalLabel ? (
                          <span
                            className={
                              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                              verticalPreviewBadgeClass(content.verticalLabel)
                            }
                          >
                            {content.verticalLabel}
                          </span>
                        ) : null}
                        {content?.dateLabel ? (
                          <span className="text-[11px] text-brand-muted">{content.dateLabel}</span>
                        ) : null}
                      </div>
                      <Dialog.Title className="mt-2 text-base font-semibold text-brand-ink">
                        {content?.title ?? 'Preview'}
                      </Dialog.Title>
                      <Dialog.Description className="mt-1 text-sm text-brand-muted">
                        Full press release details and downloadable media.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-white text-brand-ink hover:bg-brand-surface"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                <div
                  data-lenis-prevent
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4"
                >
                  {content ? (
                    <>
                      {content.heroImageUrl ? (
                        <div className="overflow-hidden rounded-2xl bg-brand-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={content.heroImageUrl}
                            alt={content.title}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </div>
                      ) : null}

                      {content.summary ? (
                        <div
                          className={
                            (content.heroImageUrl ? 'mt-4 ' : '') +
                            'rounded-2xl border border-brand-border bg-white p-4'
                          }
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                            Summary
                          </div>
                          <div className="mt-2 text-sm text-brand-ink">{content.summary}</div>
                        </div>
                      ) : null}

                      {content.imageLink ? (
                        <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
                          <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                            Image link
                          </div>
                          <div className="mt-3 overflow-hidden rounded-xl bg-brand-surface-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={content.imageLink}
                              alt={`${content.title} image`}
                              className="aspect-[4/3] w-full object-cover"
                            />
                          </div>
                          <a
                            href={content.imageLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block truncate text-sm font-medium text-brand-primary-700 hover:underline"
                          >
                            {content.imageLink}
                          </a>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                          Body
                        </div>
                        {content.bodyLoading ? (
                          <p className="mt-2 text-sm text-brand-muted">Loading release…</p>
                        ) : (
                          <RichTextRender
                            html={stripLeadingTitleFromHtml(content.body, content.title)}
                            className="mt-2 bb-richtext text-sm leading-relaxed text-brand-ink/90"
                          />
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-brand-ink">Media assets</div>
                          {content.footerMeta ? (
                            <div className="text-xs text-brand-muted">{content.footerMeta}</div>
                          ) : null}
                        </div>
                        <div className="mt-3 space-y-2">
                          {content.mediaAssets.length === 0 ? (
                            <EmptyState compact heading="No assets attached" />
                          ) : (
                            content.mediaAssets.map((a) => (
                              <a
                                key={a.href}
                                href={a.href}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-medium text-brand-primary-700 hover:bg-brand-surface"
                              >
                                {a.label}
                              </a>
                            ))
                          )}
                        </div>
                        {content.fullReleaseHref ? (
                          <div className="mt-4 border-t border-brand-border/70 pt-3">
                            <Link
                              href={content.fullReleaseHref}
                              className="text-sm font-medium text-brand-primary-700 hover:underline"
                            >
                              {content.fullReleaseLabel ?? 'View full press release →'}
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <EmptyState compact heading="Select a press release to preview" />
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

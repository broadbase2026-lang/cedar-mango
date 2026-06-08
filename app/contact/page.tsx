'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TestimonialCarousel } from '@/components/home/testimonial-carousel';

const TO_EMAIL = 'broadbase2026@gmail.com';

function buildMailto({
  name,
  email,
  company,
  message,
}: {
  name: string;
  email: string;
  company: string;
  message: string;
}) {
  const subject = `Broadbase enquiry${company ? ` — ${company}` : ''}`;
  const body = [
    message.trim(),
    '',
    '---',
    `Name: ${name || '-'}`,
    `Email: ${email || '-'}`,
    `Company: ${company || '-'}`,
  ].join('\n');

  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${TO_EMAIL}?${params.toString()}`;
}

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const mailto = useMemo(
    () =>
      buildMailto({
        name,
        email,
        company,
        message,
      }),
    [company, email, message, name],
  );

  const canSend = message.trim().length > 0;

  return (
    <main className="min-h-screen bg-brand-surface">
      <PublicSiteHeader />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <div className="inline-flex items-center rounded-full bg-white ring-1 ring-inset ring-brand-border px-3 py-1 text-xs font-medium text-brand-muted">
              Contact
            </div>
            <h1 className="mt-6 text-4xl md:text-5xl font-normal tracking-tight text-brand-ink">
              Get in touch.
            </h1>
          </div>

          <form
            className="rounded-3xl bg-white p-6 md:p-8 ring-1 ring-inset ring-brand-border shadow-media-soft"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canSend) return;
              window.location.href = mailto;
            }}
          >
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-brand-muted uppercase tracking-wide">
                    Name
                  </label>
                  <Input
                    className="mt-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-muted uppercase tracking-wide">
                    Email
                  </label>
                  <Input
                    className="mt-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    type="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-muted uppercase tracking-wide">
                  Company (optional)
                </label>
                <Input
                  className="mt-2"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company / publication"
                  autoComplete="organization"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-brand-muted uppercase tracking-wide">
                  Message
                </label>
                <Textarea
                  className="mt-2 min-h-[160px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <div className="text-xs text-brand-muted">
                  {copied ? 'Copied email draft.' : ' '}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!canSend}
                    onClick={async () => {
                      if (!canSend) return;
                      try {
                        await navigator.clipboard.writeText(
                          buildMailto({ name, email, company, message })
                            .replace(/^mailto:[^?]+\\?/, '')
                            .split('&')
                            .map((pair) => pair.split('=').map(decodeURIComponent))
                            .reduce((acc, [k, v]) => {
                              acc[k] = v;
                              return acc;
                            }, {} as Record<string, string>).body ?? '',
                        );
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1500);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    Copy draft
                  </Button>
                  <Button type="submit" disabled={!canSend}>
                    Email us
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-12 md:mt-16">
          <TestimonialCarousel heading="What teams are saying" />
        </div>
      </section>
    </main>
  );
}


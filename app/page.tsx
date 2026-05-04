import Image from 'next/image';
import Link from 'next/link';
import { Radley } from 'next/font/google';
import { APP_NAME } from '@/constants/copy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const radley = Radley({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
});

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-brand-border/70 bg-brand-surface/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/broadbase-logo.png"
                alt={APP_NAME}
                width={180}
                height={36}
                priority
                className="h-9 w-auto"
              />
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-brand-muted hover:text-brand-ink transition-colors"
              >
                Log In
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="secondary">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-brand-surface text-brand-ink">
            <div className="mx-auto max-w-6xl px-6">
              <div className="relative py-12 lg:py-20 lg:pr-16">
                <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-inset ring-brand-border px-3 py-1 text-xs text-brand-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  Journalist discovery
                </div>

                <h1
                  className={`${radley.className} mt-5 text-4xl md:text-5xl font-normal tracking-tight`}
                >
                  Discover new stories on your terms.
                </h1>

                <p className="mt-4 text-base md:text-lg text-brand-muted max-w-xl">
                  The end of the unsolicited pitch. Access the brand assets you
                  actually want using our intuitive, AI-powered database.
                </p>

                <div className="mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <Input placeholder="Search for luxury hotel openings in Singapore..." />
                    </div>
                    <Button className="sm:w-auto">Search</Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {['F&B', 'Travel', 'Culture'].map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-muted ring-1 ring-inset ring-brand-border"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Editor-ready press kits and quotes',
                    'Filter by market, vertical, and freshness',
                    'Save searches and follow beats',
                    'AI summaries for faster triage',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-brand-border shadow-media-soft"
                    >
                      <div className="text-sm font-medium">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-brand-dark text-white">
            <div className="mx-auto max-w-6xl px-6">
              <div className="relative py-12 lg:py-20 lg:pl-16">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 ring-1 ring-inset ring-white/10">
                  Brand command center
                </div>

                <h2
                  className={`${radley.className} mt-5 text-4xl md:text-5xl font-normal tracking-tight`}
                >
                  Stop chasing editors for coverage.
                </h2>

                <p className="mt-4 text-base md:text-lg text-white/70 max-w-xl">
                  Discoverable brand assets you don’t need to blast. Measurable
                  engagement data from real journalists. All in one place.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <a
                    href="/api/stripe/checkout?plan=starter"
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full sm:w-auto" variant="primary">
                      Start Your 14-Day Trial
                    </Button>
                  </a>
                  <Link href="/brand/dashboard" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto" variant="secondary">
                      View dashboard
                    </Button>
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { k: 'Assets', v: 'Press kits, image packs, fact sheets' },
                    { k: 'Signal', v: 'Who viewed what, and when' },
                    { k: 'Control', v: 'Publish once, stay discoverable' },
                    { k: 'Speed', v: 'Editor-ready outputs in minutes' },
                  ].map((m) => (
                    <div
                      key={m.k}
                      className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10"
                    >
                      <div className="text-xs font-semibold text-white/60">
                        {m.k}
                      </div>
                      <div className="mt-2 text-sm">{m.v}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 text-xs text-white/50">
                  Subscription plan: HK$780/month. Cancel anytime.
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}

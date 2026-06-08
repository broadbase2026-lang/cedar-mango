import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HomeAudienceHero } from '@/components/home/home-audience-hero';
import { TypingSearchPlaceholder } from '@/components/home/typing-search-placeholder';
import { HomeSocialProofRow } from '@/components/home/home-social-proof';
import { HomeEnterpriseModule } from '@/components/home/home-enterprise-module';
import { HomeMarketingModule } from '@/components/home/home-marketing-module';
import { CTASection, ProcessFlow } from '@/app/(public)/_components';
import { TestimonialCarousel } from '@/components/home/testimonial-carousel';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';

const headingFontClassName = 'font-heading';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <PublicSiteHeader scrollNavColor />

      <HomeAudienceHero
        radleyClassName={headingFontClassName}
        journalist={
          <>
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 z-0"
                aria-hidden
              >
                <div className="bb-hero-parallax-illustration absolute right-[-12%] top-[-6%] h-[240px] w-[min(110vw,380px)] sm:right-[-6%] sm:top-[-4%] sm:h-[300px] md:right-0 md:top-0 md:h-[380px] md:w-[min(55vw,420px)] lg:top-6 lg:h-[440px] xl:h-[480px] xl:w-[min(480px,48%)]">
                  <Image
                    src="/hero%20image.png"
                    alt=""
                    fill
                    className="object-contain object-right-top"
                    sizes="(min-width: 1280px) 480px, (min-width: 768px) 55vw, 100vw"
                    priority
                  />
                </div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/90 ring-1 ring-inset ring-border-default px-3 py-1 text-xs text-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  Journalist discovery
                </div>

                <h1
                  className={`${headingFontClassName} mt-5 text-4xl md:text-5xl font-normal tracking-tight`}
                >
                  Discover new stories on your terms.
                </h1>

                <p className="mt-4 max-w-xl text-base text-text-secondary">
                  The end of the unsolicited pitch. Access the brand assets you
                  actually want using our intuitive, AI-powered database.
                </p>

                <div className="mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <Input
                        placeholder=""
                        aria-label="Search"
                      />
                      <div className="pointer-events-none -mt-11 flex h-11 items-center px-4 text-sm text-text-disabled">
                        <TypingSearchPlaceholder
                          terms={[
                            'luxury hotel openings in Singapore...',
                            'new bars in Tokyo...',
                            'upcoming art exhibitions in Hong Kong...',
                          ]}
                        />
                      </div>
                    </div>
                    <Button className="sm:w-auto">Search</Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {[
                      'F&B',
                      'Travel',
                      'Culture',
                      'Art',
                      'Design',
                      'Sports',
                      'Healthcare',
                      'Business',
                      'Tech',
                    ].map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-inset ring-border-default"
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
                      className="rounded-2xl border border-border-default/80 bg-white/60 p-4 backdrop-blur-xl"
                    >
                      <div className="text-sm font-medium text-text-primary">
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        }
        brand={
          <>
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 z-0"
                aria-hidden
              >
                <div className="bb-hero-parallax-illustration absolute right-[-12%] top-[-6%] h-[240px] w-[min(110vw,380px)] sm:right-[-6%] sm:top-[-4%] sm:h-[300px] md:right-0 md:top-0 md:h-[380px] md:w-[min(55vw,420px)] lg:top-6 lg:h-[440px] xl:h-[480px] xl:w-[min(480px,48%)]">
                  <Image
                    src="/brand%20hero%20image.png"
                    alt=""
                    fill
                    className="object-contain object-right-top"
                    sizes="(min-width: 1280px) 480px, (min-width: 768px) 55vw, 100vw"
                    priority
                  />
                </div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 ring-1 ring-inset ring-white/10">
                  Brand command center
                </div>

                <h2
                  className={`${headingFontClassName} mt-5 text-4xl md:text-5xl font-normal tracking-tight`}
                >
                  Press releases <em>found</em>, not pitched.
                </h2>

                <p className="mt-4 max-w-xl text-base text-white/70">
                  Discoverable brand assets you don’t need to blast. Measurable
                  engagement data from real journalists. All in one place.
                </p>

                <div className="mt-7">
                  <Link href="/pricing" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto" variant="primary">
                      Start Your 14-Day Trial
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
                      className="rounded-2xl border border-white/40 bg-white/30 p-4 backdrop-blur-xl"
                    >
                      <div className="text-xs font-semibold text-white/75">
                        {m.k}
                      </div>
                      <div className="mt-2 text-sm text-white/90">{m.v}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 text-xs text-white/50">
                  Subscription plan: HK$780/month. Cancel anytime.
                </div>
              </div>
            </div>
          </>
        }
      />

      <HomeSocialProofRow
        logos={[
          {
            name: 'SCMP',
            src: '/scmp%20logo.png',
            width: 2048,
            height: 2048,
            imageClassName: 'h-[7.5rem]',
          },
          {
            name: 'Tatler',
            src: '/tatler%20logo.png',
            width: 2652,
            height: 1600,
          },
          {
            name: 'Companion',
            src: '/companion%20logo.png',
            width: 2780,
            height: 1504,
          },
          {
            name: 'Vogue',
            src: '/vogue%20logo.png',
            width: 4056,
            height: 1056,
            imageClassName: 'h-10',
          },
        ]}
      />

      <HomeEnterpriseModule
        headingClassName={headingFontClassName}
        ctaHref="/contact"
      />

      <HomeMarketingModule />

      <div className="border-t border-brand-border/70 bg-brand-surface">
        <div className="py-8 md:py-10">
          <TestimonialCarousel />
        </div>
      </div>

      <ProcessFlow />
      <CTASection />

      <PublicSiteFooter />
    </main>
  );
}

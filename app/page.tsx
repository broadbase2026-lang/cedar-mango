import Image from 'next/image';
import { FadeInScroll } from '@/components/home/fade-in-scroll';
import { ButtonLink } from '@/components/ui/button';
import { HomeAudienceHero } from '@/components/home/home-audience-hero';
import { HomeHeroIllustration } from '@/components/home/home-hero-illustration';
import { HomeHeroSearch } from '@/components/home/home-hero-search';
import { HomeSocialProofRow } from '@/components/home/home-social-proof';
import { HomeEnterpriseModule } from '@/components/home/home-enterprise-module';
import { HomeMarketingModule } from '@/components/home/home-marketing-module';
import { CTASection, ProcessFlow } from '@/app/(public)/_components';
import { TestimonialCarousel } from '@/components/home/testimonial-carousel';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';

const headingFontClassName = 'font-heading';

const HERO_CHIP_CLASS =
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset';

const JOURNALIST_FEATURE_CLASS =
  'rounded-2xl border border-border-default/80 bg-white/60 p-4 backdrop-blur-xl';

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-clip">
      <FadeInScroll />
      <PublicSiteHeader />
      <div className="bb-home-hero-stack">
        <HomeAudienceHero
        radleyClassName={headingFontClassName}
        journalist={
          <div className="relative md:min-h-[380px]">
            <HomeHeroIllustration src="/hero%20image.png" priority />

            <div className="relative z-10">
              <div
                className={`${HERO_CHIP_CLASS} bg-white/90 text-text-secondary ring-border-default`}
              >
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-accent" />
                Journalist discovery
              </div>

              <h1
                className={`${headingFontClassName} mt-5 text-4xl font-normal tracking-tight md:text-5xl`}
              >
                Discover new stories on your terms.
              </h1>

              <p className="mt-4 max-w-xl text-base text-text-secondary">
                The end of the unsolicited pitch. Access the brand assets you
                actually want using our intuitive, AI-powered database.
              </p>

              <div className="mt-6">
                <HomeHeroSearch />

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
                      className={`${HERO_CHIP_CLASS} bg-white/90 text-text-secondary ring-border-default`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  'Editor-ready press kits and quotes',
                  'Filter by market, vertical, and freshness',
                  'Save searches and follow beats',
                  'AI summaries for faster triage',
                ].map((item) => (
                  <div key={item} className={JOURNALIST_FEATURE_CLASS}>
                    <div className="text-sm font-medium text-text-primary">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
        brand={
          <div className="relative md:min-h-[380px]">
            <HomeHeroIllustration src="/brand%20hero%20image.png" priority />

            <div className="relative z-10">
              <div
                className={`${HERO_CHIP_CLASS} bg-white/10 text-white/70 ring-white/10`}
              >
                Brand command center
              </div>

              <h2
                className={`${headingFontClassName} mt-5 text-4xl font-normal tracking-tight md:text-5xl`}
              >
                Press releases <em>found</em>, not pitched.
              </h2>

              <p className="mt-4 max-w-xl text-base text-white/70">
                Discoverable brand assets you don’t need to blast. Measurable
                engagement data from real journalists. All in one place.
              </p>

              <div className="mt-8">
                <ButtonLink
                  href="/pricing"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Start Your 14-Day Trial
                </ButtonLink>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        }
      />
      </div>

      <HomeSocialProofRow
        logos={[
          {
            name: 'SCMP',
            src: '/scmp%20logo.png',
            width: 2048,
            height: 2048,
            imageClassName: 'h-12 sm:h-14',
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
            imageClassName: 'h-8 sm:h-10',
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

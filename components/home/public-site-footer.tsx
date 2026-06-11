import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/constants/copy';

const linkClassName =
  'inline-block py-1 hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark rounded-sm';

export function PublicSiteFooter() {
  return (
    <footer className="bg-brand-dark py-20">
      <div className="bb-container">
        <div className="mb-12 flex flex-col justify-between gap-12 md:flex-row">
          <div className="max-w-xs">
            <div className="mb-6">
              <Image
                src="/broadbase-logo.png"
                alt={`${APP_NAME} logo`}
                width={141}
                height={25}
                className="h-8 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              Curating the future of media relations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <div>
              <h4 className="mb-6 text-sm font-semibold text-white">Platform</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/pricing" className={linkClassName}>
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className={linkClassName}>
                    Press Kits
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className={linkClassName}>
                    Discovery
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 text-sm font-semibold text-white">Company</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/contact" className={linkClassName}>
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 text-sm font-semibold text-white">Legal</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <Link href="/terms" className={linkClassName}>
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-12 md:flex-row">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

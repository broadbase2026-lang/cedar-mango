import Link from 'next/link';
import Image from 'next/image';
import { Globe, Share2 } from 'lucide-react';
import { APP_NAME } from '@/constants/copy';

const linkClassName = 'hover:text-accent transition-colors';

export function PublicSiteFooter() {
  return (
    <footer className="bg-brand-dark py-20">
      <div className="mx-auto max-w-6xl px-6">
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

          <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
            <div>
              <h4 className="mb-6 text-sm font-semibold text-white">Platform</h4>
              <ul className="space-y-4 text-sm text-white/70">
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
              <ul className="space-y-4 text-sm text-white/70">
                <li>
                  <Link href="#" className={linkClassName}>
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className={linkClassName}>
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className={linkClassName}>
                    Press
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 text-sm font-semibold text-white">Legal</h4>
              <ul className="space-y-4 text-sm text-white/70">
                <li>
                  <Link href="/terms" className={linkClassName}>
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className={linkClassName}>
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className={linkClassName}>
                    Cookies
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
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-white/50 transition-colors hover:text-accent"
              aria-label="Website"
            >
              <Globe size={20} strokeWidth={1.75} />
            </Link>
            <Link
              href="#"
              className="text-white/50 transition-colors hover:text-accent"
              aria-label="Share"
            >
              <Share2 size={20} strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

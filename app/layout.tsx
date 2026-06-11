import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Radley } from 'next/font/google';
import './globals.css';
import { SmoothScrollProvider } from '@/components/smooth-scroll-provider';
import { APP_NAME } from '@/constants/copy';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const radley = Radley({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-radley',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Pull-based press discovery for APAC media.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Broadbase',
    url: appUrl,
    description: 'Pull-based press release discovery for APAC lifestyle media.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${appUrl}/release?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className={`${inter.variable} ${radley.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/*
          Production only: mirrors the built Tailwind bundle to /bb-globals.css (see
          scripts/copy-main-css.mjs). Next 14.2.x can mis-link layout CSS for some routes.
          In development, skip this link — it is only refreshed by `npm run build` and would
          otherwise serve stale utilities while ./globals.css already hot-reloads correctly.
        */}
        {process.env.NODE_ENV === 'production' ? (
          /* eslint-disable-next-line @next/next/no-css-tags */
          <link rel="stylesheet" href="/bb-globals.css" />
        ) : null}
      </head>
      <body className="font-sans antialiased">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
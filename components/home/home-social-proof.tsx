'use client';

import Image from 'next/image';

type SocialProofLogo = {
  name: string;
  src: string;
  width: number;
  height: number;
  imageClassName?: string;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

export function HomeSocialProofRow({
  heading = 'Trusted by teams at',
  logos,
  className,
}: {
  heading?: string;
  logos: SocialProofLogo[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        'fade-in-container border-t border-brand-border/70 bg-brand-surface',
        className,
      )}
    >
      <div className="bb-container py-10">
        <p className="fade-in-element text-center text-xs font-medium uppercase tracking-wide text-brand-muted">
          {heading}
        </p>

        <div className="mt-6 grid grid-cols-2 items-center justify-items-center gap-6 sm:flex sm:flex-wrap sm:justify-evenly">
          {logos.map((logo) => (
            <div key={logo.name} className="fade-in-element">
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className={cn(
                  'w-auto shrink-0 object-contain',
                  logo.imageClassName ?? 'h-10 sm:h-14',
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

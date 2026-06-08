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
        'border-t border-brand-border/70 bg-brand-surface',
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-center text-[1.5rem] font-normal leading-tight text-brand-muted">
          {heading}
        </h2>

        <div className="mt-6 flex w-full flex-nowrap items-center justify-evenly gap-6">
          {logos.map((logo) => (
            <Image
              key={logo.name}
              src={logo.src}
              alt={logo.name}
              width={logo.width}
              height={logo.height}
              className={cn(
                'w-auto shrink-0 object-contain',
                logo.imageClassName ?? 'h-20',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

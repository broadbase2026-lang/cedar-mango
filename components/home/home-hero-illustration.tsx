import Image from 'next/image';

const illustrationClassName =
  'bb-hero-parallax-illustration relative mx-auto mt-8 h-[200px] w-full max-w-sm md:absolute md:right-0 md:top-0 md:mx-0 md:mt-0 md:h-[380px] md:w-[min(55vw,420px)] lg:top-6 lg:h-[440px] xl:h-[480px] xl:w-[min(480px,48%)]';

type HomeHeroIllustrationProps = {
  src: string;
  priority?: boolean;
};

export function HomeHeroIllustration({
  src,
  priority = false,
}: HomeHeroIllustrationProps) {
  return (
    <div className="pointer-events-none md:absolute md:inset-0 md:z-0" aria-hidden>
      <div className={illustrationClassName}>
        <Image
          src={src}
          alt=""
          fill
          className="object-contain object-center md:object-right-top"
          sizes="(min-width: 1280px) 480px, (min-width: 768px) 55vw, 100vw"
          priority={priority}
        />
      </div>
    </div>
  );
}

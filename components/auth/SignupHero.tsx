'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { APP_NAME } from '@/constants/copy';
import { SIGNUP_HERO_GRADIENT } from '@/components/home/feature-card-gradients';

const STEPS = [
  { number: 1, text: 'Choose your role', active: true },
  { number: 2, text: 'Fill in your details', active: false },
  { number: 3, text: 'Confirm your email', active: false },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

function StepItem({
  number,
  text,
  active = false,
}: {
  number: number;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? 'flex items-center gap-3 rounded-xl border border-accent/30 bg-white px-4 py-3 text-neutral-900 shadow-lg'
          : 'flex items-center gap-3 rounded-xl border border-accent/20 bg-accent px-4 py-3 text-white'
      }
    >
      <span
        className={
          active
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white'
            : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-medium text-white/70'
        }
      >
        {number}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

export function SignupHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative hidden h-full w-[40%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-32 shadow-2xl lg:flex"
      style={{ background: SIGNUP_HERO_GRADIENT }}
    >
      <Link
        href="/"
        className="absolute left-8 top-8 z-20 text-sm font-medium text-neutral-900 underline decoration-neutral-900/30 underline-offset-2 hover:decoration-neutral-900"
      >
        Back to home
      </Link>

      <motion.div
        className="relative z-10 w-full max-w-xs space-y-8"
        variants={reduceMotion ? undefined : containerVariants}
        initial={reduceMotion ? false : 'hidden'}
        animate={reduceMotion ? undefined : 'visible'}
      >
        <motion.div variants={reduceMotion ? undefined : itemVariants}>
          <Image
            src="/broadbase-logo.png"
            alt={APP_NAME}
            width={141}
            height={25}
            className="h-7 w-auto drop-shadow-sm"
            priority
          />
        </motion.div>

        <motion.div className="space-y-3" variants={reduceMotion ? undefined : itemVariants}>
          <h2 className="whitespace-nowrap text-4xl font-normal tracking-tight text-neutral-900 drop-shadow-sm">
            Join Broadbase
          </h2>
          <p className="px-1 text-sm leading-relaxed text-neutral-900">
            Three steps to connect brands and journalists.
          </p>
        </motion.div>

        <motion.div className="space-y-3" variants={reduceMotion ? undefined : itemVariants}>
          {STEPS.map((step) => (
            <StepItem
              key={step.number}
              number={step.number}
              text={step.text}
              active={step.active}
            />
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

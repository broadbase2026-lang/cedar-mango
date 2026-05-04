import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-surface': 'rgb(var(--brand-surface) / <alpha-value>)',
        'brand-surface-2': 'rgb(var(--brand-surface-2) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        'brand-primary': 'rgb(var(--brand-primary) / <alpha-value>)',
        'brand-primary-600': 'rgb(var(--brand-primary-600) / <alpha-value>)',
        'brand-primary-700': 'rgb(var(--brand-primary-700) / <alpha-value>)',
        'brand-ink': 'rgb(var(--brand-ink) / <alpha-value>)',
        'brand-muted': 'rgb(var(--brand-muted) / <alpha-value>)',
        'brand-border': 'rgb(var(--brand-border) / <alpha-value>)',
        'brand-ring': 'rgb(var(--brand-ring) / <alpha-value>)',
      },
      boxShadow: {
        'media-soft':
          '0 1px 2px rgba(2, 6, 23, 0.05), 0 12px 32px rgba(2, 6, 23, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;

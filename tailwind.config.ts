import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
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
        // Side-specific primaries — resolved via CSS variable
        // so they switch between journalist and brand layouts.
        primary: {
          subtle: 'var(--color-primary-subtle)',
          base: 'var(--color-primary-base)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
        },
        // Unified backbone — hardcoded, never switches.
        accent: {
          DEFAULT: '#0EA579',
          hover: '#0C9068',
          subtle: '#E6F7F2',
        },
        // Semantic colours.
        success: {
          DEFAULT: '#10B981',
          subtle: '#ECFDF5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          subtle: '#FFFBEB',
        },
        error: {
          DEFAULT: '#EF4444',
          subtle: '#FEF2F2',
        },
        info: {
          DEFAULT: '#3B82F6',
          subtle: '#EFF6FF',
        },
        // Neutral greys.
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#1A1A1A',
        },
        // Semantic text aliases — use these in components,
        // not raw neutral shades, so dark mode is easy to
        // add later without touching every component.
        text: {
          primary: '#1A1A1A',
          secondary: '#6B7280',
          disabled: '#9CA3AF',
          inverse: '#FFFFFF',
        },
        // Surface and border aliases.
        surface: {
          page: '#FFFFFF',
          raised: '#F9FAFB',
          overlay: '#F3F4F6',
        },
        border: {
          default: '#E5E7EB',
          strong: '#D1D5DB',
        },
      },
      fontFamily: {
        // Inter is loaded via next/font in the root layout.
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui'],
        // Radley — headings (h1–h6, .font-serif, .font-heading).
        serif: ['var(--font-radley)', 'Radley', 'ui-serif', 'Georgia', 'serif'],
        heading: ['var(--font-radley)', 'Radley', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-sm': ['2rem', { lineHeight: '2.5rem' }],
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

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
        // brand-* names are migration aliases of the semantic tokens below.
        'brand-surface': 'rgb(var(--brand-surface) / <alpha-value>)',
        'brand-surface-2': 'rgb(var(--brand-surface-2) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        'brand-primary': 'rgb(var(--color-accent) / <alpha-value>)',
        'brand-primary-600': 'rgb(var(--color-accent) / <alpha-value>)',
        'brand-primary-700': 'rgb(var(--color-accent-hover) / <alpha-value>)',
        'brand-ink': 'rgb(var(--brand-ink) / <alpha-value>)',
        'brand-muted': 'rgb(var(--brand-muted) / <alpha-value>)',
        'brand-border': 'rgb(var(--brand-border) / <alpha-value>)',
        'brand-ring': 'rgb(var(--color-accent) / <alpha-value>)',
        // Side-specific identity (gold / coral) — not the action color.
        primary: {
          subtle: 'var(--color-primary-subtle)',
          base: 'var(--color-primary-base)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
        },
        // Single action color.
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          subtle: 'rgb(var(--color-accent-subtle) / <alpha-value>)',
        },
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
        text: {
          primary: 'rgb(var(--brand-ink) / <alpha-value>)',
          secondary: 'rgb(var(--brand-muted) / <alpha-value>)',
          disabled: '#9CA3AF',
          inverse: '#FFFFFF',
        },
        surface: {
          page: '#FFFFFF',
          raised: 'rgb(var(--brand-surface) / <alpha-value>)',
          overlay: 'rgb(var(--brand-surface-2) / <alpha-value>)',
        },
        border: {
          default: 'rgb(var(--brand-border) / <alpha-value>)',
          strong: '#D1D5DB',
        },
      },
      borderRadius: {
        control: '0.5rem',
        card: '0.75rem',
        panel: '1rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui'],
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

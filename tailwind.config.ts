import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
          800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))',
        },
        surface: {
          DEFAULT: 'hsl(var(--card))',
          elevated: 'hsl(var(--popover))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        swiss: 'var(--shadow-swiss)',
        'swiss-hover': '0 20px 40px -8px rgba(0, 0, 0, 0.1)',
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      // The suite's size ramp (DESIGN.md §Typography). Every fixed size the site is
      // allowed to use lives here; nothing below 10px, and a new size joins the ramp
      // before it appears in code.
      fontSize: {
        'label-micro': ['0.625rem', { lineHeight: '1.5' }],
        'label-caps': ['0.6875rem', { lineHeight: '1.5', letterSpacing: '0.24em' }],
        caption: ['0.75rem', { lineHeight: '1.5' }],
        'ui-sm': ['0.8125rem', { lineHeight: '1.5' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
        'ui-md': ['0.9375rem', { lineHeight: '1.5' }],
        'body-md': ['1rem', { lineHeight: '1.5' }],
        'lead-lg': ['1.125rem', { lineHeight: '1.55' }],
        'title-sm': ['1.3125rem', { lineHeight: '1.2' }],
        'title-md': ['1.625rem', { lineHeight: '1.15' }],
        'display-md': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['2.125rem', { lineHeight: '1.05' }],
        'display-lg': ['2.375rem', { lineHeight: '1.05' }],
        'display-tool': ['3rem', { lineHeight: '1.04' }],
        'display-xl': ['3.75rem', { lineHeight: '1.04', letterSpacing: '-0.02em' }],
        'numeral-lg': ['4rem', { lineHeight: '0.9' }],
        'numeral-xl': ['4.5rem', { lineHeight: '1' }],
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        shimmer: 'shimmer 2s infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;

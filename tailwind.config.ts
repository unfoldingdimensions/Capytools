import type { Config } from 'tailwindcss';

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
                }
            },
            spacing: {
                't-1': 'var(--space-1)',
                't-2': 'var(--space-2)',
                't-3': 'var(--space-3)',
                't-4': 'var(--space-4)',
                't-5': 'var(--space-5)',
                't-6': 'var(--space-6)',
                't-8': 'var(--space-8)',
                't-10': 'var(--space-10)',
                't-12': 'var(--space-12)',
                't-16': 'var(--space-16)',
                't-20': 'var(--space-20)',
                't-24': 'var(--space-24)',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                't-sm': 'var(--radius-sm)',
                't-md': 'var(--radius-md)',
                't-lg': 'var(--radius-lg)',
                't-xl': 'var(--radius-xl)',
                't-2xl': 'var(--radius-2xl)',
                't-3xl': 'var(--radius-3xl)',
                't-full': 'var(--radius-full)',
            },
            transitionDuration: {
                fast: 'var(--duration-fast)',
                normal: 'var(--duration-normal)',
                slow: 'var(--duration-slow)',
                slower: 'var(--duration-slower)',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
                display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'swiss': 'var(--shadow-swiss)',
                'swiss-hover': '0 20px 40px -8px rgba(0, 0, 0, 0.1)',
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'shimmer': 'shimmer 2s infinite',
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
    plugins: [require('tailwindcss-animate')],
};

export default config;


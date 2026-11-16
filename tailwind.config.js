/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: v('bg'),
        surface: v('surface'),
        surface2: v('surface-2'),
        line: v('border'),
        ink: v('text'),
        muted: v('muted'),
        faint: v('faint'),
        primary: v('primary'),
        'primary-soft': v('primary-soft'),
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans TC"',
          '"PingFang TC"',
          '"Microsoft JhengHei"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 24 40 / 0.04), 0 1px 3px rgb(16 24 40 / 0.04)',
        pop: '0 12px 32px rgb(16 24 40 / 0.16), 0 2px 6px rgb(16 24 40 / 0.08)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        check: {
          '0%': { transform: 'scale(0.6)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 220ms ease-out both',
        fade: 'fade 160ms ease-out both',
        pop: 'pop 180ms ease-out both',
        check: 'check 220ms ease-out both',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Cormorant Garamond', 'Georgia', 'Times New Roman', 'serif'],
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Semantic theme colours wired to CSS custom properties
        t: {
          primary:      'var(--t-primary)',
          'primary-lt': 'var(--t-primary-light)',
          'primary-dk': 'var(--t-primary-dark)',
          accent:       'var(--t-accent)',
          'accent-lt':  'var(--t-accent-light)',
          bg:           'var(--t-bg-base)',
          card:         'var(--t-bg-card)',
          'card-hover': 'var(--t-bg-card-hover)',
          surface:      'var(--t-surface)',
          'surface-m':  'var(--t-surface-muted)',
          text1:        'var(--t-text-1)',
          text2:        'var(--t-text-2)',
          text3:        'var(--t-text-3)',
          border:       'var(--t-border)',
          'border-lt':  'var(--t-border-light)',
          glow:         'var(--t-glow)',
          'glow-s':     'var(--t-glow-strong)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--t-border)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

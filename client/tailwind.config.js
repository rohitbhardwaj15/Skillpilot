/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      colors: {
        // Dark wave theme — full-site dark surfaces, driven from these
        // tokens (App.jsx root uses bg-base/text-ink so this flips
        // everything at once). 'dark' tokens below now double as the
        // literal base/surface values.
        base: '#0a0a0f',
        surface: '#14141f',
        'surface-alt': '#1d1d30',
        border: 'rgba(255, 255, 255, 0.08)',
        ink: '#F3F4F8',
        'ink-soft': '#A7ABC4',
        'ink-faint': '#6E7390',
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a2e',
          600: '#252542',
          500: '#333355',
        },
        accent: {
          orange: '#D97B0F',
          'orange-soft': '#FDF0DE',
          gold: '#d4a574',
          amber: '#ff9500',
          teal: '#0E9C8F',
          'teal-soft': '#E1F5F2',
          cyan: '#00b4d8',
          purple: '#6D28D9',
          'purple-soft': '#F1EBFC',
          pink: '#ec4899',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.1)',
          heavy: 'rgba(255, 255, 255, 0.15)',
        },
        // Wave theme — taken from the abstract wave landing-page template.
        // Used for the hero + navbar to give the site that gradient look.
        wave: {
          navy: '#1c2b52',
          indigo: '#3d3568',
          plum: '#6b3f70',
          magenta: '#a9527f',
          pink: '#d9789f',
          blush: '#f3c3ca',
        },
      },
      backgroundImage: {
        'wave-gradient': 'linear-gradient(165deg, #1c2b52 0%, #33305f 20%, #6b3f70 42%, #a9527f 62%, #d9789f 80%, #12121a 100%)',
        'wave-gradient-soft': 'linear-gradient(180deg, #1c2b52 0%, #4a3a6b 30%, #b06188 65%, #f3c3ca 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
        'orbit': 'orbit 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 166, 35, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(245, 166, 35, 0.6), 0 0 40px rgba(245, 166, 35, 0.3)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(100px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(100px) rotate(-360deg)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

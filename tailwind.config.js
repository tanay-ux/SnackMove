/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B4EAA',
          light: '#8B6FCC',
          dark: '#533D88',
          50: '#F3F0FA',
          100: '#E6E0F5',
          200: '#C9BCEB',
          300: '#A998DE',
          400: '#8B6FCC',
          500: '#6B4EAA',
          600: '#533D88',
          700: '#3D2D66',
          800: '#281E44',
          900: '#140F22',
        },
        accent: {
          pink: '#E85D8C',
          yellow: '#F5C242',
          blue: '#5B9BD5',
          gray: '#2D2D2D',
          green: '#34C759',
          orange: '#FF9500',
        },
        surface: {
          DEFAULT: '#FAFAFA',
          raised: '#FFFFFF',
          sunken: '#F3F4F6',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
        button: '0.75rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.1)',
        soft: '0 2px 12px rgba(107,78,170,0.08)',
        glow: '0 0 20px rgba(107,78,170,0.25)',
        'glow-sm': '0 0 10px rgba(107,78,170,0.15)',
        nav: '0 -4px 30px rgba(0,0,0,0.08)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,0.04)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6B4EAA 0%, #8B6FCC 50%, #A998DE 100%)',
        'gradient-warm': 'linear-gradient(135deg, #6B4EAA 0%, #E85D8C 100%)',
        'gradient-calm': 'linear-gradient(135deg, #5B9BD5 0%, #6B4EAA 100%)',
        'gradient-energy': 'linear-gradient(135deg, #F5C242 0%, #E85D8C 100%)',
        'gradient-surface': 'linear-gradient(180deg, #FAFAFA 0%, #F3F4F6 100%)',
        'gradient-hero': 'linear-gradient(135deg, #6B4EAA 0%, #533D88 40%, #6B4EAA 100%)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'count-up': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.35s cubic-bezier(0.33, 1, 0.68, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.33, 1, 0.68, 1)',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        breathe: 'breathe 4s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        'count-up': 'count-up 0.4s cubic-bezier(0.33, 1, 0.68, 1)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

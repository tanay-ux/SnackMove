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
        },
        accent: {
          pink: '#E85D8C',
          yellow: '#F5C242',
          blue: '#5B9BD5',
          gray: '#2D2D2D',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
        button: '0.75rem',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

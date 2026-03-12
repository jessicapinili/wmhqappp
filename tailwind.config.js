/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6B1010',
          light: '#8B1515',
          dark: '#4A0B0B',
        },
        influence: '#3B82F6',
        visibility: '#F59E0B',
        cash: '#10B981',
        identity: '#8B5CF6',
        cream: '#FDF6EE',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

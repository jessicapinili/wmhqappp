/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3d0c0c',
          light: '#5c1414',
          dark: '#2a0808',
        },
        influence: '#3B82F6',
        visibility: '#F59E0B',
        cash: '#10B981',
        identity: '#8B5CF6',
        cream: '#FDF6EE',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

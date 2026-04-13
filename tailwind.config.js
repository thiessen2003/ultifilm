/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand palette derived from the Ultifilm design system
        brand: {
          50:  '#eef0ff',
          100: '#dde1ff',
          200: '#b8beff',
          300: '#8a90fc',
          400: '#5f62f8',
          500: '#3535e0',   // primary — navbar, main buttons
          600: '#2626c4',
          700: '#1c1ca4',
          800: '#151582',
          900: '#0e0e60',
        },
      },
    },
  },
  plugins: [],
}

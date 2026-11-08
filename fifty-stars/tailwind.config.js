/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: { 950: '#04010d', 900: '#080319', 800: '#0e0530', 700: '#170a45', 600: '#241163' },
        plum: { 900: '#2a0d52', 700: '#4a1a82', 500: '#7b3fc4', 300: '#b98cf0' },
        blush: { 200: '#ffd3ea', 300: '#ffb3d9', 400: '#ff8cc6', 500: '#ff5fae', 600: '#e03a92' },
        gold: { 100: '#fff6d8', 200: '#ffeaa8', 300: '#ffdc7a', 400: '#ffc94d', 500: '#f4ac26' },
      },
      fontFamily: {
        script: ['"Great Vibes"', '"Cormorant Garamond"', 'cursive'],
        display: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        ui: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 40px rgba(8, 2, 30, 0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
        gold: '0 0 28px rgba(255, 201, 77, 0.55), 0 0 80px rgba(255, 140, 198, 0.25)',
      },
    },
  },
  plugins: [],
};

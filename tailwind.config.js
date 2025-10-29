/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        legislative: '#2563eb',
        budget: '#16a34a',
        ulurp: '#ea580c',
      },
    },
  },
  plugins: [],
};

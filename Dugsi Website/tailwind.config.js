/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['"Amiri Quran"', '"Scheherazade New"', '"Noto Naskh Arabic"', 'serif'],
      },
      colors: {
        ink: '#0f172a',
        cream: '#faf7f2',
        gold: '#b08a3e',
        mosque: '#0e6b5e',
      },
    },
  },
  plugins: [],
};

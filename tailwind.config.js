/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hc: {
            green: '#769382',
            light: '#C0C3B9',
            cream: '#F3EFE3',
            beige: '#E8DCC4', 
            dark: '#4A4C4A',
            white: '#FFFFFF'
        }
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        sarabun: ['var(--font-sarabun)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

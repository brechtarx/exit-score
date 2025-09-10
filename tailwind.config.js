/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,js}",
    "./netlify/functions/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'bright-white': '#FAFAFA',
        'light-stone-white': '#F0F1F2',
        'cool-gray': '#B3B6B8',
        'hyperlink-blue': '#416EA6',
        'dark-anchor': '#101620'
      },
      fontFamily: {
        'sans': ['Open Sans', 'sans-serif'],
        'heading': ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
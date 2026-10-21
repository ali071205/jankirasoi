/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#C15A10',
        'primary-container': '#C15A10',
        'on-primary': '#FFFFFF',
        secondary: '#00875A',
        surface: '#0F172A',
        'surface-container': '#1E293B',
        'surface-container-high': '#334155',
        'on-surface': '#F8FAFC',
      },
      fontFamily: {
        headline: ['"DM Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

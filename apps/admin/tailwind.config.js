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
        primary: "#1d5c34",
        "primary-container": "#38754a",
        "on-primary": "#ffffff",
        secondary: "#875200",
        "secondary-container": "#ffad45",
        "on-secondary-container": "#6f4300",
        surface: "#f8fbf0",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f5ea",
        "surface-container": "#ecefe4",
        "surface-container-high": "#e6e9df",
        "on-surface": "#191d16",
        "on-surface-variant": "#404941",
        outline: "#717970",
      },
      fontFamily: {
        headline: ['"DM Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

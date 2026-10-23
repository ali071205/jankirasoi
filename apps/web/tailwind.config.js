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
        primary: "#38754A", // Fresh Green
        "primary-hover": "#285C38", // Deep Green
        "primary-container": "#38754A",
        "on-primary": "#FFFFFF",
        "on-primary-container": "#EAF4ED",
        "primary-fixed": "#EAF4ED", // Light Green (Success background)
        "primary-fixed-dim": "#CBE8D3",
        "on-primary-fixed": "#10331A",
        "on-primary-fixed-variant": "#285C38",
        "inverse-primary": "#CBE8D3",

        secondary: "#E99A32", // Warm Orange (Accent / Highlights)
        "secondary-hover": "#D38520",
        "secondary-container": "#E99A32",
        "on-secondary": "#FFFFFF",
        "on-secondary-container": "#4A2E07",
        "secondary-fixed": "#FFF1DC", // Light Orange (Warning background)
        "secondary-fixed-dim": "#FFE2B8",
        "on-secondary-fixed": "#3E2300",
        "on-secondary-fixed-variant": "#8C550A",

        tertiary: "#285C38",
        "tertiary-container": "#38754A",
        "on-tertiary": "#FFFFFF",
        "on-tertiary-container": "#EAF4ED",
        "tertiary-fixed": "#EAF4ED",
        "tertiary-fixed-dim": "#CBE8D3",
        "on-tertiary-fixed": "#10331A",
        "on-tertiary-fixed-variant": "#285C38",

        surface: "#FFF9F0", // Warm Cream (Main background)
        "surface-dim": "#F3EADF",
        "surface-bright": "#FFF9F0",
        "surface-variant": "#EEE7DC",
        "surface-tint": "#38754A",
        "surface-container-lowest": "#FFFFFF", // White (Cards / Surfaces)
        "surface-container-low": "#F7F2E8", // Soft warm card background
        "surface-container": "#FFF9F0", // Warm Cream
        "surface-container-high": "#EEE7DC", // Soft Beige (Borders)
        "surface-container-highest": "#E4DDD1",

        "on-surface": "#292D26", // Charcoal (Main text)
        "on-surface-variant": "#77786F", // Muted Gray (Secondary text)
        "inverse-surface": "#292D26",
        "inverse-on-surface": "#FFF9F0",
        background: "#FFF9F0", // Warm Cream
        "on-background": "#292D26", // Charcoal

        outline: "#EEE7DC", // Soft Beige (Borders)
        "outline-variant": "#E4DDD1",

        // Semantic brand tokens matching user specifications
        "brand-cream": "#FFF9F0",
        "brand-white": "#FFFFFF",
        "brand-green": "#38754A",
        "brand-deep-green": "#285C38",
        "brand-orange": "#E99A32",
        "brand-charcoal": "#292D26",
        "brand-gray": "#77786F",
        "brand-beige": "#EEE7DC",
        "brand-success-bg": "#EAF4ED",
        "brand-warning-bg": "#FFF1DC",
        "brand-error": "#C94B45",

        error: "#C94B45", // Soft Red
        "error-container": "#FDE8E7",
        "on-error": "#FFFFFF",
        "on-error-container": "#601410",
      },
      spacing: {
        margin: "1rem",
        "margin-desktop": "2.5rem",
        gutter: "1rem",
        "gutter-desktop": "1.5rem",
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
      },
      fontFamily: {
        headline: ["DM Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        "display-lg": ["DM Sans", "sans-serif"],
        "display-lg-mobile": ["DM Sans", "sans-serif"],
        "headline-lg": ["DM Sans", "sans-serif"],
        "headline-md": ["DM Sans", "sans-serif"],
        "headline-sm": ["DM Sans", "sans-serif"],
        "title-md": ["DM Sans", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-lg": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};


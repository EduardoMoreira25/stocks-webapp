/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Override gray completely (outside extend) with neutral grays (no blue tint)
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000',
      white: '#fff',
      gray: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0a0a0a',
      },
      red: {
        100: '#fee2e2',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      green: {
        100: '#dcfce7',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        800: '#166534',
        900: '#14532d',
      },
      blue: {
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      },
      orange: {
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
      },
      amber: {
        500: '#f59e0b',
      },
      cyan: {
        500: '#06b6d4',
      },
      lime: {
        500: '#84cc16',
      },
      indigo: {
        500: '#6366f1',
      },
      purple: {
        500: '#a855f7',
      },
      teal: {
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
      },
      yellow: {
        400: '#facc15',
      },
    },
    extend: {
      colors: {
        brand: {
          navy: '#1e3a8a',
          orange: '#f97316',
          blue: '#3b82f6',
          teal: '#14b8a6',
        },
      }
    },
  },
  plugins: [],
}

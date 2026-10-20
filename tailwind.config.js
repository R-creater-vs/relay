/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F3F0EA',
        ink: {
          DEFAULT: '#202B31',
          light: '#3C4B53',
          muted: '#63727B',
        },
        replicaA: {
          DEFAULT: '#2459A6',
          light: '#EEF4FD',
          dark: '#173D73',
          border: '#BFD5F8',
        },
        replicaB: {
          DEFAULT: '#AE533B',
          light: '#FDF3F0',
          dark: '#7A3423',
          border: '#F8CEBE',
        },
        staleAmber: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#92400E',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

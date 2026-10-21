/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        bklit: {
          bg: '#09090b',
          surface: '#0e0e12',
          elevated: '#14141a',
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.16)',
        }
      },
      boxShadow: {
        'bklit': '0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.55)',
        'glow-emerald': '0 0 24px -4px rgba(16, 185, 129, 0.35)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.35)',
        'glow-rose': '0 0 24px -4px rgba(244, 63, 94, 0.35)',
        'glow-cyan': '0 0 24px -4px rgba(6, 182, 212, 0.35)',
      }
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // HUD redesign: dark-only by design (a holographic HUD has no light
  // variant). No darkMode config at all — every dark: variant was collapsed
  // into single always-on values during the conversion, so there is exactly
  // one theme and nothing for a media query or class toggle to switch.
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#060a14',
          panel: '#0e182c',
          accent: '#38e1ff',
          text: '#d9e7f3',
          muted: '#8299b3',
          good: '#3dd68c',
          warn: '#ffb454',
          crit: '#ff6b6b',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'Cascadia Code', 'SF Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

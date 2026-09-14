import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        verya: {
          bg: '#0B0D12',
          panel: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.07)',
          'text-primary': '#E8EAF0',
          'text-secondary': '#6B7585',
          'text-muted': '#3D4357',
          accent: '#6366F1',
          'accent-hover': '#818CF8',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
      }
    }
  },
  plugins: []
} satisfies Config

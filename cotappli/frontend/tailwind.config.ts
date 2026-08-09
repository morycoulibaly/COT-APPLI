import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Teal profond = confiance / caisse commune ; or chaud = épargne / prospérité
        ink: '#12211F',
        teal: {
          50: '#EAF3F1',
          100: '#CFE4E0',
          400: '#1E6B62',
          600: '#124A44',
          700: '#0D3733',
        },
        gold: {
          100: '#FBEAD1',
          400: '#E0A458',
          600: '#B97F34',
        },
        sand: '#F7F4EE',
        line: '#E4E0D6',
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

export default config;

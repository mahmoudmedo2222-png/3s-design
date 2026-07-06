import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        muted: '#6f6a61',
        paper: '#f5f7f5',
        line: '#d8ded6',
        pine: '#22594b',
        berry: '#8f3152',
        saffron: '#c68a2d',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(23, 23, 23, 0.09)',
      },
    },
  },
  plugins: [],
};

export default config;

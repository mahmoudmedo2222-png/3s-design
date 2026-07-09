import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--3s-ink)',
        muted: 'var(--3s-muted)',
        paper: 'var(--3s-paper)',
        line: 'var(--3s-line)',
        pine: 'var(--3s-pine)',
        berry: 'var(--3s-berry)',
        saffron: 'var(--3s-saffron)',
        gold: 'var(--3s-gold)',
        cream: 'var(--3s-cream)',
        success: 'var(--3s-success)',
        warning: 'var(--3s-warning)',
        danger: 'var(--3s-danger)',
        surface: 'var(--3s-surface)',
        'surface-raised': 'var(--3s-surface-raised)',
        'surface-inverse': 'var(--3s-surface-inverse)',
        'pine-hover': 'var(--3s-pine-hover)',
        'gold-strong': 'var(--3s-gold-strong)',
        'cream-ink': 'var(--3s-cream-ink)',
      },
      boxShadow: {
        panel: 'var(--3s-shadow-soft)',
        premium: 'var(--3s-shadow-premium)',
      },
    },
  },
  plugins: [],
};

export default config;

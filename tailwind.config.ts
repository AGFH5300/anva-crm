import type { Config } from 'tailwindcss';

export default {
  content: ['index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a73e8',
        secondary: '#0b3954',
        accent: '#f2a365',
        success: '#2ecc71',
        warning: '#f39c12',
        danger: '#e74c3c'
      }
    }
  },
  plugins: []
} satisfies Config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* Tipografía moderna Outfit desde Google Fonts */
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      /* Paleta de colores premium para el juego de dominó */
      colors: {
        table: '#1b7340',
        'table-dark': '#0a2e18',
        'table-light': '#22915a',
        tile: '#fdfbf7',
        'tile-border': '#c4b89a',
        pip: '#1a1a2e',
        gold: '#f0c040',
        'gold-dark': '#c9952a',
        emerald: '#10b981',
        'emerald-dark': '#059669',
      },
      /* Animaciones personalizadas para micro-interacciones */
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(240, 192, 64, 0.2), 0 0 20px rgba(240, 192, 64, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(240, 192, 64, 0.4), 0 0 40px rgba(240, 192, 64, 0.2)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      /* Sombras avanzadas para glassmorphism */
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-strong': '0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        'neon-green': '0 0 15px rgba(16, 185, 129, 0.4), 0 0 30px rgba(16, 185, 129, 0.2)',
        'neon-gold': '0 0 15px rgba(240, 192, 64, 0.4), 0 0 30px rgba(240, 192, 64, 0.2)',
      },
    },
  },
  plugins: [],
};

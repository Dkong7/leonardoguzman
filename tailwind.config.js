/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nardo: {
          950: '#05010a', // Fondo casi negro absoluto
          900: '#0f0518', // Fondo principal (Deep Purple)
          800: '#1a0b2e', // Tarjetas / Navbar
          700: '#2d1b4e', // Bordes
          500: '#9d4edd', // Púrpura Neón (Primario)
          400: '#c77dff', // Púrpura Claro (Hover)
          100: '#e0e0e0', // Texto
        }
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
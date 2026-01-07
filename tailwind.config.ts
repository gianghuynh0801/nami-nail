import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf9f7',
          100: '#f5f1eb',
          200: '#e8ddd0',
          300: '#d4c4a8',
          400: '#bca37f',  // Main NAMI color
          500: '#9d8565',
          600: '#7d6a4f',
          700: '#5d4f3a',
          800: '#3d3426',
          900: '#1d1913',
        },
        beige: {
          light: '#faf9f7',
          DEFAULT: '#f5f1eb',
          dark: '#e8ddd0',
        },
        pastel: {
          pink: '#ffd6e8',
          'pink-light': '#ffeef5',
          'pink-dark': '#ffb3d1',
          yellow: '#fff9e6',
          'yellow-light': '#fffef5',
          'yellow-dark': '#ffeeb3',
          white: '#ffffff',
        },
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(188, 163, 127, 0.1), 0 10px 20px -2px rgba(188, 163, 127, 0.05)',
        'glow': '0 0 20px rgba(188, 163, 127, 0.2)',
        'glow-beige': '0 0 30px rgba(188, 163, 127, 0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config

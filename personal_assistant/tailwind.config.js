/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'Segoe UI', 'sans-serif']
      },
      colors: {
        navy: {
          900: '#0a0a2e',
          800: '#0f0f3c',
          700: '#14144a'
        },
        anime: {
          purple: '#9b59b6',
          pink: '#e91e8c',
          cyan: '#00e5ff',
          gold: '#ffd700',
          violet: '#7c3aed'
        }
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out'
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(233,30,140,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(233,30,140,0.9)' }
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        }
      }
    }
  },
  plugins: []
}

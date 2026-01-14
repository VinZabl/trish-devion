/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cafe: {
          accent: '#60A5FA', // Light blue
          dark: '#01121F', // Dark background
          cream: '#E0F2FE',
          beige: '#BAE6FD',
          latte: '#7DD3FC',
          espresso: '#0EA5E9',
          light: '#F0F9FF',
          // In-game credits theme colors
          primary: '#60A5FA', // Light blue primary
          secondary: '#38BDF8', // Sky blue
          darkBg: '#01121F', // Main background (navy blue)
          darkCard: '#0A1F2E', // Card background
          glass: 'rgba(255, 255, 255, 0.1)', // Glass effect
          text: '#E0F2FE', // Light text
          textMuted: '#94A3B8' // Muted text
        }
      },
      fontFamily: {
        'sans': ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'anton': ['Anton', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
};
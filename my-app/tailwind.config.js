export default {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      container: {
        center: false,
        padding: '0',
      },
      colors: {
        brand: {
          50: '#fff6ef',
          100: '#ffe9d9',
          200: '#fdcfae',
          300: '#fbad78',
          400: '#f78a47',
          500: '#f37021',
          600: '#e15814',
          700: '#ba4212',
          800: '#943617',
          900: '#782f16',
        },
        ink: {
          800: '#1a1a1f',
          900: '#111114',
          950: '#09090b',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #f78a47 0%, #f37021 45%, #e15814 100%)',
        'brand-dark': 'linear-gradient(135deg, #1a1a1f 0%, #09090b 100%)',
        'brand-sunset': 'linear-gradient(135deg, #f37021 0%, #e15814 50%, #111114 100%)',
        'brand-mesh':
          'radial-gradient(at 0% 0%, rgba(243,112,33,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(251,173,120,0.16) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(225,88,20,0.12) 0px, transparent 50%)',
      },
      boxShadow: {
        'brand-glow': '0 10px 40px -10px rgba(243,112,33,0.45)',
        'brand-soft': '0 4px 24px -6px rgba(243,112,33,0.18)',
        card: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px -8px rgba(16,24,40,0.10)',
        'card-hover': '0 2px 4px rgba(16,24,40,0.05), 0 20px 40px -12px rgba(16,24,40,0.18)',
      },
      keyframes: {
        'ui-fade-up': { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'ui-fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'ui-scale-in': { '0%': { opacity: 0, transform: 'scale(0.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'ui-slide-in-right': { '0%': { opacity: 0, transform: 'translateX(24px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        'ui-slide-in-left': { '0%': { opacity: 0, transform: 'translateX(-24px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        'ui-gradient-x': { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'ui-float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'ui-glow': { '0%, 100%': { boxShadow: '0 0 0 0 rgba(243,112,33,0.45)' }, '50%': { boxShadow: '0 0 0 10px rgba(243,112,33,0)' } },
        'ui-shimmer': { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        'ui-spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-up': 'ui-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'ui-fade-in 0.5s ease-out both',
        'scale-in': 'ui-scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'ui-slide-in-right 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left': 'ui-slide-in-left 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'gradient-x': 'ui-gradient-x 6s ease infinite',
        'float-slow': 'ui-float 6s ease-in-out infinite',
        'glow': 'ui-glow 2s ease-in-out infinite',
        'shimmer': 'ui-shimmer 1.4s linear infinite',
        'spin-slow': 'ui-spin-slow 12s linear infinite',
      },
    },
  },
  plugins: [],
}

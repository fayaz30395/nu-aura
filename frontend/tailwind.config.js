/** @type {import('tailwindcss').Config} */
/**
 * NU-AURA Theme - Tailwind CSS Configuration
 * Final theme: Material Dashboard 2 navy-tinted palette
 */

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        // AURA Midnight - Premium Palette (matches login page)
        midnight: {
          deep: '#0a0e27',        // Background
          obsidian: '#0f1330',    // Surfaces
          card: 'rgba(255, 255, 255, 0.04)', // Glass surface
          elevated: '#161b3d',    // Elevated surface
        },
        // Semantic Tokens for Stable Theming
        brand: {
          main: '#8B5CF6',
          secondary: '#06B6D4',
          accent: '#F43F5E',
        },
        // Primary - Electric Violet (Vibrant accent)
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8B5CF6', // Main primary
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Secondary - Neon Cyan
        secondary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4', // Main secondary
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Accent - Sunset Rose
        accent: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#F43F5E', // Main accent
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        // Success - Emerald Glow
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981', // Main success
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Info - Blue Light
        'blue-light': {
          25: '#f5fbff',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e6fe',
          300: '#7cd4fd',
          400: '#36bffa',
          500: '#0ba5ec',
          600: '#0086c9',
          700: '#026aa2',
          800: '#065986',
          900: '#0b4a6f',
          950: '#062c41',
        },
        // Warning - Amber (matching Mantine theme)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Danger - Red (matching Mantine theme)
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      boxShadow: {
        'theme-xs': '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
        'theme-sm': '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
        'theme-md': '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
        'theme-lg': '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
        'theme-xl': '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
        // Dark mode shadows - stronger, deeper glow on dark backgrounds
        'dark-xs': '0px 1px 2px 0px rgba(0, 0, 0, 0.6)',
        'dark-sm': '0px 1px 3px 0px rgba(0, 0, 0, 0.7), 0px 1px 2px 0px rgba(0, 0, 0, 0.6)',
        'dark-md': '0px 4px 12px -2px rgba(0, 0, 0, 0.8), 0px 2px 6px -2px rgba(0, 0, 0, 0.7)',
        'dark-lg': '0px 16px 24px -4px rgba(0, 0, 0, 0.9), 0px 6px 10px -2px rgba(0, 0, 0, 0.5)',
        'dark-xl': '0px 24px 32px -4px rgba(0, 0, 0, 1), 0px 12px 14px -4px rgba(0, 0, 0, 0.6)',
        // Semantic shadows (auto-adapt via CSS vars)
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'elevated': 'var(--shadow-elevated)',
        'dropdown': 'var(--shadow-dropdown)',
      },
      // Enhanced Animation Configuration
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'fade-in-left': 'fadeInLeft 0.4s ease-out',
        'fade-in-right': 'fadeInRight 0.4s ease-out',

        // Slide animations
        'slide-in-up': 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-down': 'slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',

        // Scale animations
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in-center': 'scaleInCenter 0.3s cubic-bezier(0.16, 1, 0.3, 1)',

        // Bounce animations
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',

        // Spin & Pulse
        'spin-slow': 'spin 3s linear infinite',
        'spin-slower': 'spin 6s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        // Shimmer & Loading
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-slow': 'shimmer 3s linear infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',

        // Interactive
        'wiggle': 'wiggle 0.5s ease-in-out',
        'shake': 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',

        // Page transitions
        'page-enter': 'pageEnter 0.3s ease-out',
        'page-exit': 'pageExit 0.2s ease-in',
      },
      keyframes: {
        // Fade keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },

        // Slide keyframes
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },

        // Scale keyframes
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleInCenter: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },

        // Bounce keyframes
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },

        // Pulse & Glow
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.7)',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(139, 92, 246, 0)',
            opacity: '0.8',
          },
        },

        // Shimmer
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        skeleton: {
          '0%': { opacity: '0.6' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.6' },
        },

        // Interactive
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },

        // Page transitions
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pageExit: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
      },
      // Enhanced Transitions
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
        '2000': '2000ms',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      // Backdrop Blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [
    // Custom plugin for advanced utilities
    function({ addUtilities, addComponents, theme }) {
      // Glass morphism utility
      addUtilities({
        '.glass': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-dark': {
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
        '.glass-strong': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
      });

      // Gradient utilities
      addUtilities({
        '.gradient-primary': {
          background: 'linear-gradient(135deg, #465fff 0%, #8b5cf6 100%)',
        },
        '.gradient-secondary': {
          background: 'linear-gradient(135deg, #667085 0%, #344767 100%)',
        },
        '.gradient-success': {
          background: 'linear-gradient(135deg, #12b76a 0%, #039855 100%)',
        },
        '.gradient-mesh': {
          background: 'radial-gradient(at 0% 0%, rgba(70, 95, 255, 0.1) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(70, 95, 255, 0.1) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(139, 92, 246, 0.1) 0px, transparent 50%)',
        },
      });

      // Shadow utilities
      addUtilities({
        '.shadow-glow-primary': {
          boxShadow: '0 0 20px rgba(70, 95, 255, 0.3)',
        },
        '.shadow-glow-success': {
          boxShadow: '0 0 20px rgba(18, 183, 106, 0.3)',
        },
        '.shadow-glow-error': {
          boxShadow: '0 0 20px rgba(240, 68, 56, 0.3)',
        },
      });
    },
  ],
}

/** @type {import('tailwindcss').Config} */
/**
 * NU-AURA Theme - Tailwind CSS Configuration
 * Palette: Radix Jade + Slate (cool neutrals) with Sky/Orange accents
 */

const {
  amber,
  grass,
  jade,
  orange,
  sand,
  sky,
  slate,
  tomato,
} = require('@radix-ui/colors');

const toScale = (scale, prefix) => ({
  50: scale[`${prefix}1`],
  100: scale[`${prefix}2`],
  200: scale[`${prefix}3`],
  300: scale[`${prefix}4`],
  400: scale[`${prefix}5`],
  500: scale[`${prefix}6`],
  600: scale[`${prefix}7`],
  700: scale[`${prefix}8`],
  800: scale[`${prefix}9`],
  900: scale[`${prefix}10`],
  950: scale[`${prefix}12`],
});

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
        sans: ['var(--font-sans)', 'Space Grotesk', 'Manrope', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'DM Serif Display', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'IBM Plex Mono', 'monospace'],
        outfit: ['var(--font-sans)', 'Space Grotesk', 'Manrope', 'sans-serif'],
      },
      colors: {
        // ── Design Token Bridge (CSS Variables → Tailwind) ──────
        // Usage: bg-background, text-foreground, border-border, bg-card, etc.
        background: 'var(--bg-main)',
        foreground: 'var(--text-primary)',
        card: {
          DEFAULT: 'var(--bg-card)',
          hover: 'var(--bg-card-hover)',
          foreground: 'var(--text-primary)',
        },
        'surface-bg': {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          sidebar: 'var(--bg-sidebar)',
          input: 'var(--bg-input)',
          overlay: 'var(--bg-overlay)',
        },
        muted: {
          DEFAULT: 'var(--text-muted)',
          foreground: 'var(--text-secondary)',
        },
        border: {
          DEFAULT: 'var(--border-main)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        ring: {
          DEFAULT: 'var(--ring-primary)',
          danger: 'var(--ring-danger)',
          success: 'var(--ring-success)',
        },
        'text-theme': {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        // Header & Dropdown tokens (adaptive light/dark via CSS vars)
        'header': {
          DEFAULT: 'var(--header-bg)',
          border: 'var(--header-border)',
        },
        'dropdown': {
          DEFAULT: 'var(--dropdown-bg)',
          border: 'var(--dropdown-border)',
          hover: 'var(--dropdown-hover)',
          text: 'var(--dropdown-text)',
          'text-secondary': 'var(--dropdown-text-secondary)',
          divider: 'var(--dropdown-divider)',
        },

        // AURA Midnight - Deep neutral palette (Zinc-based)
        midnight: {
          deep: '#09090b',
          obsidian: '#111113',
          card: '#141416',
          elevated: '#1a1a1d',
        },
        // Semantic Tokens for Stable Theming
        brand: {
          main: jade.jade9,
          secondary: sky.sky9,
          accent: orange.orange9,
        },
        // Primary - Jade (Radix)
        primary: toScale(jade, 'jade'),
        // Secondary - Slate (Radix)
        secondary: toScale(slate, 'slate'),
        // Accent - Orange (Radix)
        accent: toScale(orange, 'orange'),
        // Success - Grass (Radix)
        success: toScale(grass, 'grass'),
        // Info - Sky (Radix)
        info: toScale(sky, 'sky'),
        'blue-light': toScale(sky, 'sky'),
        // Warning - Amber (Radix)
        warning: toScale(amber, 'amber'),
        // Danger - Tomato (Radix)
        danger: toScale(tomato, 'tomato'),
        // Surface - Slate (Radix) — cool neutral, not warm sand
        surface: toScale(slate, 'slate'),
        // Legacy aliases -> new palette (keeps existing classnames consistent)
        purple: toScale(jade, 'jade'),
        violet: toScale(orange, 'orange'),
        indigo: toScale(sky, 'sky'),
        blue: toScale(sky, 'sky'),
        teal: toScale(jade, 'jade'),
        pink: toScale(orange, 'orange'),
        rose: toScale(tomato, 'tomato'),
        cyan: toScale(sky, 'sky'),
        green: toScale(grass, 'grass'),
        emerald: toScale(grass, 'grass'),
        red: toScale(tomato, 'tomato'),
        yellow: toScale(amber, 'amber'),
        orange: toScale(orange, 'orange'),
        amber: toScale(amber, 'amber'),
        slate: toScale(slate, 'slate'),
        sand: toScale(sand, 'sand'),
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
            boxShadow: '0 0 0 0 rgba(41, 163, 131, 0.7)',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(41, 163, 131, 0)',
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
          background: `linear-gradient(135deg, ${jade.jade8} 0%, ${sky.sky9} 100%)`,
        },
        '.gradient-secondary': {
          background: `linear-gradient(135deg, ${slate.slate7} 0%, ${slate.slate10} 100%)`,
        },
        '.gradient-success': {
          background: `linear-gradient(135deg, ${grass.grass8} 0%, ${grass.grass10} 100%)`,
        },
        '.gradient-mesh': {
          background: `radial-gradient(at 0% 0%, rgba(41, 163, 131, 0.14) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(247, 107, 21, 0.14) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0, 116, 158, 0.12) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(41, 163, 131, 0.12) 0px, transparent 50%)`,
        },
      });

      // Shadow utilities
      addUtilities({
        '.shadow-glow-primary': {
          boxShadow: '0 0 20px rgba(41, 163, 131, 0.3)',
        },
        '.shadow-glow-success': {
          boxShadow: '0 0 20px rgba(70, 167, 88, 0.3)',
        },
        '.shadow-glow-error': {
          boxShadow: '0 0 20px rgba(229, 77, 46, 0.3)',
        },
      });
    },
  ],
}

/** @type {import('tailwindcss').Config} */
/**
 * NU-AURA Theme - Tailwind CSS Configuration
 * Aesthetic: Civic Canvas (Warm, crafted enterprise)
 * Philosophy: Human clarity + tactical depth + calm momentum
 *
 * Design Principles:
 * - Warm surfaces with high legibility
 * - Purposeful hierarchy (serif headings, mono metrics)
 * - Signal teal accent (used sparingly)
 * - Soft material depth
 * - Meaningful motion (page + stagger)
 */

const {
  amber,
  blue,
  grass,
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

const sand = {
  50: '#faf7f1',
  100: '#f3eee6',
  200: '#e7dfd4',
  300: '#d7cdbf',
  400: '#c5b8a7',
  500: '#a89482',
  600: '#8a7868',
  700: '#6b5b4d',
  800: '#4c4036',
  900: '#332b24',
  950: '#1f1914',
};

const teal = {
  50: '#f0fdfa',
  100: '#ccfbf1',
  200: '#99f6e4',
  300: '#5eead4',
  400: '#2dd4bf',
  500: '#14b8a6',
  600: '#0d9488',
  700: '#0f766e',
  800: '#115e59',
  900: '#134e4a',
  950: '#042f2e',
};

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
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'SF Mono', 'Monaco', 'Cascadia Code', 'Consolas', 'Courier New', 'monospace'],
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

        // ── Accent (Signal Teal) ─────────────────────────────────
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          subtle: 'var(--accent-primary-subtle)',
          ...teal,
        },

        // ── Primary (Alias for accent for backward compatibility) ──
        primary: {
          DEFAULT: 'var(--accent-primary)',
          ...teal,
        },

        // ── Neutrals (Warm Sand) ─────────────────────────────────
        secondary: sand,
        surface: sand,
        slate: sand,

        // ── Semantic Colors (Professional, Muted) ───────────────
        success: toScale(grass, 'grass'),
        danger: toScale(tomato, 'tomato'),
        warning: toScale(amber, 'amber'),
        info: toScale(blue, 'blue'),

        // ── Legacy Color Aliases (Backward Compatibility) ───────
        blue: toScale(blue, 'blue'),
        green: toScale(grass, 'grass'),
        red: toScale(tomato, 'tomato'),
        yellow: toScale(amber, 'amber'),
        amber: toScale(amber, 'amber'),
      },
      boxShadow: {
        // Soft material depth
        'xs': '0 1px 0 rgba(16, 24, 40, 0.04)',
        'sm': '0 1px 0 rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.08)',
        'DEFAULT': '0 1px 0 rgba(16, 24, 40, 0.05), 0 8px 20px rgba(16, 24, 40, 0.10)',
        'md': '0 1px 0 rgba(16, 24, 40, 0.06), 0 12px 28px rgba(16, 24, 40, 0.12)',
        'lg': '0 1px 0 rgba(16, 24, 40, 0.06), 0 16px 32px rgba(16, 24, 40, 0.14)',
        'xl': '0 1px 0 rgba(16, 24, 40, 0.08), 0 24px 48px rgba(16, 24, 40, 0.18)',
        '2xl': '0 1px 0 rgba(16, 24, 40, 0.10), 0 32px 64px rgba(16, 24, 40, 0.22)',
        // Semantic shadows (auto-adapt via CSS vars)
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'elevated': 'var(--shadow-elevated)',
        'dropdown': 'var(--shadow-dropdown)',
        'none': 'none',
      },
      // Refined Animation Configuration (Fast, Purposeful)
      animation: {
        // Essential animations only
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.2s ease-out',
        'slide-in-up': 'slideInUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-left': 'slideInLeft 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'rise-in': 'riseIn 0.28s ease-out',

        // Loading states
        'shimmer': 'shimmer 1.5s linear infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',

        // Page transitions (faster)
        'page-enter': 'pageEnter 0.2s ease-out',
      },
      keyframes: {
        // Essential keyframes only
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        skeleton: {
          '0%': { opacity: '0.6' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.6' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      // Fast, Snappy Transitions
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'DEFAULT': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
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
    // Minimal utility plugins
    function({ addUtilities }) {
      // No glassmorphism — clean, solid surfaces
      addUtilities({
        '.surface-hover': {
          transition: 'background-color 150ms ease-out, border-color 150ms ease-out',
        },
        '.surface-hover:hover': {
          backgroundColor: 'var(--bg-card-hover)',
          borderColor: 'var(--border-strong)',
        },
      });
    },
  ],
}

/** @type {import('tailwindcss').Config} */
/**
 * NU-AURA Theme - Tailwind CSS Configuration
 * Aesthetic: Single Hue Blue (Professional, elegant enterprise)
 * Philosophy: Human clarity + tactical depth + calm momentum
 *
 * Design Principles:
 * - Neutral surfaces with maximum clarity
 * - Purposeful hierarchy (serif headings, mono metrics)
 * - Pure blue accent (bold, decisive)
 * - Minimal material depth
 * - Meaningful motion (page + stagger)
 */

const gray = {
  50: '#f8f9fb',
  100: '#f0f1f5',
  200: '#e2e4ea',
  300: '#d1d4dc',
  400: '#a1a6b4',
  500: '#71778a',
  600: '#545a6e',
  700: '#3d4255',
  800: '#282c3a',
  900: '#1a1d28',
  950: '#0f1118',
};

const blue = {
  50: '#f0f4ff',
  100: '#dce4ff',
  200: '#b8c9ff',
  300: '#94adff',
  400: '#7092ff',
  500: '#4d77ff',
  600: '#3a5fd9',
  700: '#2a48b3',
  800: '#1c328d',
  900: '#101e66',
  950: '#081240',
};

const semanticColors = {
  success: {
    50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC',
    400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D',
    800: '#166534', 900: '#14532D', 950: '#052E16',
  },
  danger: {
    50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5',
    400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C',
    800: '#991B1B', 900: '#7F1D1D', 950: '#450A0A',
  },
  warning: {
    50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D',
    400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309',
    800: '#92400E', 900: '#78350F', 950: '#451A03',
  },
  info: {
    50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
    400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
    800: '#1E40AF', 900: '#1E3A8A', 950: '#172554',
  },
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

        // ── Accent (Single-Hue Blue) ───────────────────────────
        accent: {
          DEFAULT: blue[600],
          hover: blue[700],
          subtle: blue[50],
          ...blue,
        },

        // ── Primary (Alias for accent for backward compatibility) ──
        primary: {
          DEFAULT: blue[600],
          ...blue,
        },

        // ── Neutrals (Neutral Gray) ────────────────────────────
        secondary: gray,
        surface: gray,
        slate: gray,

        // ── Semantic Colors (Professional, Crisp) ───────────────
        success: semanticColors.success,
        danger: semanticColors.danger,
        warning: semanticColors.warning,
        info: semanticColors.info,

        // ── Legacy Color Aliases (Backward Compatibility) ───────
        blue: semanticColors.info,
        green: semanticColors.success,
        red: semanticColors.danger,
        yellow: semanticColors.warning,
        amber: semanticColors.warning,
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
        // Skeuomorphic shadows (auto-adapt via CSS vars)
        'skeuo-card': 'var(--shadow-skeuo-card)',
        'skeuo-card-hover': 'var(--shadow-skeuo-card-hover)',
        'skeuo-button': 'var(--shadow-skeuo-button)',
        'skeuo-pressed': 'var(--shadow-skeuo-pressed)',
        'skeuo-input': 'var(--shadow-skeuo-input)',
        'skeuo-emboss': 'var(--shadow-skeuo-emboss)',
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
    // Utility plugins
    function({ addUtilities }) {
      addUtilities({
        '.surface-hover': {
          transition: 'background-color 150ms ease-out, border-color 150ms ease-out',
        },
        '.surface-hover:hover': {
          backgroundColor: 'var(--bg-card-hover)',
          borderColor: 'var(--border-strong)',
        },
        // Skeuomorphic glass background utilities
        '.glass-bg': {
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          '-webkit-backdrop-filter': 'blur(var(--glass-blur))',
          border: '1px solid var(--glass-border)',
        },
        // Noise texture overlay
        '.noise-texture': {
          position: 'relative',
        },
        '.noise-texture::after': {
          content: '""',
          position: 'absolute',
          inset: '0',
          borderRadius: 'inherit',
          backgroundImage: 'var(--skeuo-noise)',
          backgroundRepeat: 'repeat',
          pointerEvents: 'none',
          opacity: '0.35',
        },
      });
    },
  ],
}

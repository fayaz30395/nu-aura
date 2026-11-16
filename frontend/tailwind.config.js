/** @type {import('tailwindcss').Config} */
/**
 * NU-AURA Theme - Tailwind CSS Configuration
 * Neutral Apple-style system: Geist type, refined blue accent (#2563EB / dark #6EA8FE).
 * Colours resolve to CSS variables in app/globals.css (light + dark).
 */

const gray = {
  50: '#FAFAFC', 100: '#F5F5F7', 200: '#E5E5EA', 300: '#C7C7CC', 400: '#8E8E93',
  500: '#6E6E73', 600: '#55555B', 700: '#3A3A3F', 800: '#242428', 900: '#1D1D1F', 950: '#111113',
};

// Colors defined in app/globals.css as RGB triplets (`--x-rgb`) so the
// opacity modifiers (`bg-accent-500/10`) keep working against a CSS var.
const fromVar = (name) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

// ── NULogic accent scale (refined blue) — anchor step 600 (#2563EB).
// Reads the --aura-accent-* scale, which is theme-independent (same in dark).
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, fromVar(`aura-accent-${step}`)]),
);

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
  // Info is muted blue-slate (#4A6FA5 family), distinct from the blue accent.
  info: {
    50: '#EDF1F8', 100: '#D3DDEC', 200: '#B3C4DE', 300: '#8FA9D4',
    400: '#6F8CBF', 500: '#4A6FA5', 600: '#44659A', 700: '#375282',
    800: '#2B4068', 900: '#1F2E4B', 950: '#141D31',
  },
};

// ── Aura product accents (bundle rail) — --prod-* CSS vars ──
const prod = {
  hrms: fromVar('prod-hrms'),
  hire: fromVar('prod-hire'),
  grow: fromVar('prod-grow'),
  fluence: fromVar('prod-fluence'),
};

// ── Aura chart palette — same values as the --chart-1..5 CSS vars ──
const chart = {
  1: '#2563EB',
  2: '#6B7FA8',
  3: prod.hire,
  4: prod.grow,
  5: prod.fluence,
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
      // Typography — Geist Sans (UI + headings) / Geist Mono (code, IDs).
      // CSS vars are set by next/font in app/layout.tsx.
      fontFamily: {
        // Full stacks (brand font + fallbacks) live in the --font-* vars.
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      // Contract type scale (--font-size-* vars). sm/base/lg intentionally keep
      // Tailwind defaults; see the type-scale note in app/globals.css.
      fontSize: {
        '2xs': ['var(--font-size-2xs)', {lineHeight: 'var(--line-height-2xs)'}],
        '3xs': ['var(--font-size-2xs)', {lineHeight: 'var(--line-height-2xs)'}],
        xs: ['var(--font-size-xs)', {lineHeight: 'var(--line-height-xs)'}],
        xl: ['var(--font-size-xl)', {lineHeight: 'var(--line-height-xl)'}],
        title: ['var(--font-size-title)', {lineHeight: 'var(--line-height-title)', fontWeight: 'var(--font-weight-heading)'}],
      },
      // ── Aura radii — --r-* CSS vars (aliased to the contract --radius-*) ──
      borderRadius: {
        'aura-xs': 'var(--r-xs)',
        'aura-sm': 'var(--r-sm)',
        'aura-md': 'var(--r-md)',
        'aura-lg': 'var(--r-lg)',
        'aura-xl': 'var(--r-xl)',
        'aura-2xl': 'var(--r-2xl)',
        'aura-control': 'var(--r-control)',
      },
      height: {
        'control-sm': 'var(--control-sm)',
        'control-md': 'var(--control-md)',
        'control-lg': 'var(--control-lg)',
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
          heading: 'var(--text-heading)',
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

        // ── Aura token bridge (CSS Variables → Tailwind, light/dark aware) ──
        // Usage: bg-rail, bg-nav, text-text-1, border-aura, bg-surface-aura, etc.
        rail: {
          DEFAULT: 'var(--rail)',
          2: 'var(--rail-2)',
        },
        nav: {
          DEFAULT: 'var(--nav)',
          soft: 'var(--nav-soft)',
          active: 'var(--nav-active)',
        },
        'surface-aura': {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-aura-2)',
          hover: 'var(--surface-hover)',
          sunken: 'var(--surface-sunken)',
          app: 'var(--bg-app)',
          canvas: 'var(--bg-canvas)',
        },
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'on-rail': {
          DEFAULT: 'var(--on-rail)',
          dim: 'var(--on-rail-dim)',
        },
        'border-aura': {
          DEFAULT: 'var(--border)',
          soft: 'var(--border-soft)',
          strong: 'var(--border-aura-strong)',
          focus: 'var(--border-focus)',
        },
        prod,
        chart,
        // Status — token-driven (light/dark aware) fg/bg/border
        status: {
          'ok-fg': 'var(--ok-fg)', 'ok-bg': 'var(--ok-bg)', 'ok-bd': 'var(--ok-bd)',
          'warn-fg': 'var(--warn-fg)', 'warn-bg': 'var(--warn-bg)', 'warn-bd': 'var(--warn-bd)',
          'err-fg': 'var(--err-fg)', 'err-bg': 'var(--err-bg)', 'err-bd': 'var(--err-bd)',
          'info-fg': 'var(--info-fg)', 'info-bg': 'var(--info-bg)', 'info-bd': 'var(--info-bd)',
          'neutral-fg': 'var(--neutral-fg)', 'neutral-bg': 'var(--neutral-bg)', 'neutral-bd': 'var(--neutral-bd)',
        },

        // ── Accent: DEFAULT/hover follow the theme-aware --accent token ──
        accent: {
          DEFAULT: fromVar('accent'),
          hover: fromVar('accent-hover'),
          subtle: brand[50],
          soft: 'var(--accent-soft)',
          ...brand,
        },

        // ── Primary (Alias for accent for backward compatibility) ──
        primary: {
          DEFAULT: fromVar('accent'),
          ...brand,
        },

        // ── NULogic Brand Secondary Colors ──────────────────────
        'nu-red': {
          DEFAULT: '#E62A32',
          50: '#FEF2F2', 100: '#FDE6E7', 200: '#F9B8BA', 300: '#F58A8E',
          400: '#EE5A5F', 500: '#E62A32', 600: '#C41E25', 700: '#A2181E',
          800: '#801217', 900: '#5E0D10', 950: '#3D0809',
        },
        'nu-purple': {
          DEFAULT: '#8939A1',
          50: '#F8F0FA', 100: '#EFDBF4', 200: '#D9ADE3', 300: '#C37FD2',
          400: '#A95ABB', 500: '#8939A1', 600: '#702E85', 700: '#572369',
          800: '#3E194D', 900: '#250F31', 950: '#160A1F',
        },
        'nu-teal': {
          DEFAULT: '#133E49',
          50: '#E8F3F6', 100: '#C5E0E7', 200: '#8DC1CF',
          300: '#55A2B7', 400: '#2D7080', 500: '#133E49',
          600: '#0F333D', 700: '#0B2831', 800: '#071D25', 900: '#041219',
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
        // Aura soft-depth scale (auto-adapt via CSS vars)
        'sh-xs': 'var(--sh-xs)',
        'sh-sm': 'var(--sh-sm)',
        'sh-md': 'var(--sh-md)',
        'sh-lg': 'var(--sh-lg)',
        'sh-pop': 'var(--sh-pop)',
        'sh-focus': 'var(--sh-focus)',
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
        // Durations/easings come from the --motion-* / --ease-* tokens.
        'fade-in': 'fadeIn var(--motion-base) var(--ease-out)',
        'fade-in-up': 'fadeInUp var(--motion-base) var(--ease-out)',
        'slide-in-up': 'slideInUp var(--motion-base) var(--ease-out)',
        'slide-in-left': 'slideInLeft var(--motion-slow) var(--ease-out)',
        'rise-in': 'riseIn var(--motion-base) var(--ease-out)',

        // Loading states
        'shimmer': 'shimmer 1.5s linear infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',

        'page-enter': 'pageEnter var(--motion-base) var(--ease-out)',
      },
      keyframes: {
        // Essential keyframes only
        fadeIn: {
          '0%': {opacity: '0'},
          '100%': {opacity: '1'},
        },
        fadeInUp: {
          '0%': {opacity: '0', transform: 'translateY(var(--motion-rise-distance))'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        riseIn: {
          '0%': {opacity: '0', transform: 'translateY(var(--motion-rise-distance))'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        slideInUp: {
          '0%': {transform: 'translateY(100%)', opacity: '0'},
          '100%': {transform: 'translateY(0)', opacity: '1'},
        },
        slideInLeft: {
          '0%': {transform: 'translateX(-100%)', opacity: '0'},
          '100%': {transform: 'translateX(0)', opacity: '1'},
        },
        shimmer: {
          '0%': {backgroundPosition: '-200% 0'},
          '100%': {backgroundPosition: '200% 0'},
        },
        skeleton: {
          '0%': {opacity: '0.6'},
          '50%': {opacity: '1'},
          '100%': {opacity: '0.6'},
        },
        pageEnter: {
          '0%': {opacity: '0', transform: 'translateY(var(--motion-rise-distance))'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
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
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      transitionTimingFunction: {
        'DEFAULT': 'var(--ease-standard)',
        'smooth': 'var(--ease-standard)',
        standard: 'var(--ease-standard)',
        out: 'var(--ease-out)',
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
    function ({addUtilities}) {
      addUtilities({
        '.surface-hover': {
          transition: 'background-color 150ms ease-out, border-color 150ms ease-out',
        },
        '.surface-hover:hover': {
          backgroundColor: 'var(--bg-card-hover)',
          borderColor: 'var(--border-main)',
        },
        // Skeuomorphic glass background
        '.glass-bg': {
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          '-webkit-backdrop-filter': 'blur(var(--glass-blur))',
          border: '1px solid var(--glass-border)',
        },
        // Skeuomorphic emboss text
        '.skeuo-emboss': {
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.4)',
        },
        // Skeuomorphic inset shadow
        '.skeuo-inset': {
          boxShadow: 'var(--shadow-skeuo-input)',
        },
        // Skeuomorphic button depth
        '.skeuo-button': {
          backgroundImage: 'var(--gradient-skeuo-button)',
          boxShadow: 'var(--shadow-skeuo-button)',
        },
        // Skeuomorphic card depth
        '.skeuo-card': {
          backgroundImage: 'var(--gradient-skeuo-card)',
          boxShadow: 'var(--shadow-skeuo-card)',
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
          opacity: '0.40',
        },
      });
    },
  ],
}

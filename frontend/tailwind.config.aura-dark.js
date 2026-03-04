/** @type {import('tailwindcss').Config} */
/**
 * nu-aura Dark Theme - Inspired by Modern CEO Dashboard
 *
 * Design Philosophy:
 * - Dark-first design with vibrant accent colors
 * - High contrast for readability
 * - Subtle glows and gradients for depth
 * - Professional, executive-grade aesthetics
 */

module.exports = {
  darkMode: 'class', // Enable with <html class="dark">
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Primary font - Clean, modern sans-serif
        sans: ['DM Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        // Monospace for numbers, codes, metrics
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // ══════════════════════════════════════════════════════
        // AURA DARK THEME COLORS
        // ══════════════════════════════════════════════════════

        // Background Colors - Deep dark blues
        aura: {
          bg: '#0B0F19',        // Main background - deepest
          surface: '#111827',   // Elevated surfaces
          card: '#151D2E',      // Card backgrounds
          hover: '#1A2235',     // Hover states
          border: '#1E293B',    // Borders and dividers
        },

        // Primary - Vibrant Blue (Main CTA color)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6',       // ← Main primary (Aura Blue)
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          glow: 'rgba(59, 130, 246, 0.15)',  // Glow effect
        },

        // Success - Vibrant Green
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10B981',       // ← Main success (Aura Green)
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          glow: 'rgba(16, 185, 129, 0.12)',
        },

        // Danger - Vibrant Red
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444',       // ← Main danger (Aura Red)
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          glow: 'rgba(239, 68, 68, 0.12)',
        },

        // Warning - Amber
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B',       // ← Main warning (Aura Amber)
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          glow: 'rgba(245, 158, 11, 0.12)',
        },

        // Info - Cyan
        info: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4',       // ← Main info (Aura Cyan)
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },

        // Accent - Purple (for highlights, badges)
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#8B5CF6',       // ← Main accent (Aura Purple)
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },

        // Text Colors - High contrast for readability
        text: {
          primary: '#F1F5F9',     // Main text on dark
          secondary: '#94A3B8',   // Secondary text
          muted: '#64748B',       // Muted text
          disabled: '#475569',    // Disabled text
        },

        // Surface variations (for cards, panels, modals)
        surface: {
          50: '#ffffff',    // Pure white (light mode)
          100: '#f9fafb',   // Very light gray
          200: '#f3f4f6',   // Light gray
          300: '#e5e7eb',   // Border light
          400: '#9ca3af',   // Placeholder
          500: '#6b7280',   // Secondary text light
          600: '#4b5563',   // Body text light
          700: '#374151',   // Headings light
          800: '#1f2937',   // Card dark mode
          900: '#111827',   // Background dark mode
          950: '#0B0F19',   // Deepest dark (Aura BG)
        },
      },

      // ══════════════════════════════════════════════════════
      // TYPOGRAPHY - Professional, readable scales
      // ══════════════════════════════════════════════════════
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],          // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],  // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1.16', letterSpacing: '-0.03em' }],       // 48px
      },

      // ══════════════════════════════════════════════════════
      // SPACING - Consistent scale
      // ══════════════════════════════════════════════════════
      spacing: {
        '4.5': '1.125rem',  // 18px
        '5.5': '1.375rem',  // 22px
        '13': '3.25rem',    // 52px
        '15': '3.75rem',    // 60px
        '18': '4.5rem',     // 72px
        '22': '5.5rem',     // 88px
      },

      // ══════════════════════════════════════════════════════
      // SHADOWS - Subtle depth with glows
      // ══════════════════════════════════════════════════════
      boxShadow: {
        // Standard shadows
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',

        // Card shadows
        'card': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',

        // Glow effects (for important elements)
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.12)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.12)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.12)',
        'glow-accent': '0 0 20px rgba(139, 92, 246, 0.15)',

        // Input states
        'input-focus': '0 0 0 3px rgba(59, 130, 246, 0.15)',
        'input-error': '0 0 0 3px rgba(239, 68, 68, 0.15)',
        'input-success': '0 0 0 3px rgba(16, 185, 129, 0.15)',

        // Elevated UI
        'elevated': '0 2px 8px -2px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      },

      // ══════════════════════════════════════════════════════
      // BORDER RADIUS - Modern, rounded aesthetics
      // ══════════════════════════════════════════════════════
      borderRadius: {
        'sm': '0.375rem',   // 6px
        'DEFAULT': '0.5rem', // 8px
        'md': '0.625rem',   // 10px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.25rem',   // 20px
        '3xl': '1.5rem',    // 24px
      },

      // ══════════════════════════════════════════════════════
      // ANIMATIONS - Smooth, professional transitions
      // ══════════════════════════════════════════════════════
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.25)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },

      // ══════════════════════════════════════════════════════
      // BACKGROUNDS - Gradients for cards and buttons
      // ══════════════════════════════════════════════════════
      backgroundImage: {
        // Dark gradients for cards
        'card-dark': 'linear-gradient(180deg, rgba(21, 29, 46, 0.8) 0%, rgba(17, 24, 39, 0.8) 100%)',
        'surface-dark': 'linear-gradient(180deg, rgba(17, 24, 39, 1) 0%, rgba(11, 15, 25, 1) 100%)',

        // Button gradients
        'btn-primary': 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
        'btn-success': 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
        'btn-danger': 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
        'btn-warning': 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',

        // Accent backgrounds
        'gradient-primary': 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%)',
        'gradient-success': 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)',

        // Shimmer effect
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
      },

      // ══════════════════════════════════════════════════════
      // BACKDROP BLUR - For glassmorphism effects
      // ══════════════════════════════════════════════════════
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },

      // ══════════════════════════════════════════════════════
      // TRANSITIONS - Smooth easing functions
      // ══════════════════════════════════════════════════════
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

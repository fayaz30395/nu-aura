'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';
import {
  amber,
  blue,
  grass,
  tomato,
} from '@radix-ui/colors';

const toMantineTuple = (scale: Record<string, string>, name: string): MantineColorsTuple => [
  scale[`${name}1`],
  scale[`${name}2`],
  scale[`${name}3`],
  scale[`${name}4`],
  scale[`${name}5`],
  scale[`${name}6`],
  scale[`${name}7`],
  scale[`${name}8`],
  scale[`${name}9`],
  scale[`${name}10`],
];

// ─── New Design System (Blue/Gray) ────────────────────────────────────────

// Primary/Accent - Pure blue
const accent: MantineColorsTuple = [
  '#f0f4ff',   // 0 — accent-50
  '#dce4ff',   // 1 — accent-100
  '#b8c9ff',   // 2 — accent-200
  '#94adff',   // 3 — accent-300
  '#7092ff',   // 4 — accent-400
  '#4d77ff',   // 5 — accent-500
  '#3a5fd9',   // 6 — accent-600
  '#2a48b3',   // 7 — accent-700
  '#1c328d',   // 8 — accent-800
  '#101e66',   // 9 — accent-900
];

// Neutrals - Neutral gray
const secondary: MantineColorsTuple = [
  '#f8f9fb',   // 0 — neutral-50
  '#f0f1f5',   // 1 — neutral-100
  '#e2e4ea',   // 2 — neutral-200
  '#d1d4dc',   // 3 — neutral-300
  '#a1a6b4',   // 4 — neutral-400
  '#71778a',   // 5 — neutral-500
  '#545a6e',   // 6 — neutral-600
  '#3d4255',   // 7 — neutral-700
  '#282c3a',   // 8 — neutral-800
  '#1a1d28',   // 9 — neutral-900
];

// Semantic colors (professional, muted)
const success = toMantineTuple(grass, 'grass');
const warning = toMantineTuple(amber, 'amber');
const danger = toMantineTuple(tomato, 'tomato');
const info = toMantineTuple(blue, 'blue');

// Surface - same as secondary (slate)
const surface = secondary;

export const theme = createTheme({
  colors: {
    accent,
    primary: accent, // Alias for backward compatibility
    secondary,
    success,
    warning,
    danger,
    info,
    surface,
    // Legacy aliases for backward compatibility
    blue: info,
    indigo: accent,
    violet: accent,
    purple: accent,
    green: success,
    red: danger,
    yellow: warning,
    amber: warning,
  },

  primaryColor: 'accent',
  primaryShade: { light: 6, dark: 4 },

  // Typography - IBM Plex (humanist + editorial)
  fontFamily: 'var(--font-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace: 'var(--font-mono), "SF Mono", "Monaco", "Cascadia Code", "Consolas", "Courier New", monospace',

  headings: {
    fontFamily: 'var(--font-display), var(--font-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.15' },
      h2: { fontSize: '1.875rem', lineHeight: '1.2' },
      h3: { fontSize: '1.5rem', lineHeight: '1.2' },
      h4: { fontSize: '1.25rem', lineHeight: '1.3' },
      h5: { fontSize: '1.125rem', lineHeight: '1.4' },
      h6: { fontSize: '1rem', lineHeight: '1.5' },
    },
  },

  // Border radius - slightly smaller (refined aesthetic)
  radius: {
    xs: '0.375rem', // 6px
    sm: '0.5rem',   // 8px
    md: '0.75rem',  // 12px (default)
    lg: '1rem',     // 16px (cards)
    xl: '1.25rem',  // 20px (modals)
  },
  defaultRadius: 'md',

  // Spacing - generous (24px default instead of 16px)
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px (generous spacing)
    xl: '2rem',     // 32px (page padding)
  },

  // Shadows - soft material depth
  shadows: {
    xs: '0 1px 0 rgba(16, 24, 40, 0.04)',
    sm: '0 1px 0 rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.08)',
    md: '0 1px 0 rgba(16, 24, 40, 0.05), 0 8px 20px rgba(16, 24, 40, 0.10)',
    lg: '0 1px 0 rgba(16, 24, 40, 0.06), 0 16px 32px rgba(16, 24, 40, 0.14)',
    xl: '0 1px 0 rgba(16, 24, 40, 0.08), 0 24px 48px rgba(16, 24, 40, 0.18)',
  },

  cursorType: 'pointer',
  focusRing: 'auto',

  // Component defaults
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'background-color 180ms ease-out, border-color 180ms ease-out, box-shadow 180ms ease-out',
        },
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
      styles: {
        input: {
          // Larger touch target (44px)
          minHeight: '44px',
          transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
        },
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
        size: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        padding: 'lg', // 24px internal padding
      },
      styles: {
        root: {
          transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: 'xl',
        padding: 'xl',
      },
      styles: {
        content: {
          transition: 'transform 150ms ease-out, opacity 150ms ease-out',
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
    Table: {
      styles: {
        thead: {
          backgroundColor: 'var(--bg-elevated)',
        },
        th: {
          fontSize: '0.75rem', // 12px
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--text-secondary)',
          padding: '0.75rem 1.5rem', // 12px 24px
        },
        td: {
          padding: '1rem 1.5rem', // 16px 24px
        },
      },
    },
  },
});

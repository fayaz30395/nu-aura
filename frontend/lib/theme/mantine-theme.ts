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

// ─── NULogic Brand Design System ──────────────────────────────────────────

// Primary/Accent - NULogic Lapis Blue
const accent: MantineColorsTuple = [
  '#eeeeff',   // 0 — accent-50
  '#d4d4f7',   // 1 — accent-100
  '#a8a8ef',   // 2 — accent-200
  '#7c7ce6',   // 3 — accent-300
  '#5050de',   // 4 — accent-400
  '#2525b0',   // 5 — accent-500
  '#0f0f8a',   // 6 — accent-600
  '#050766',   // 7 — accent-700 (NULogic Lapis Blue)
  '#040555',   // 8 — accent-800
  '#030344',   // 9 — accent-900
];

// Neutrals - NULogic Teal Gray
const secondary: MantineColorsTuple = [
  '#F4F5F6',   // 0 — neutral-50 (NULogic Near-White)
  '#ecedef',   // 1 — neutral-100
  '#d8dadd',   // 2 — neutral-200
  '#c0c3c8',   // 3 — neutral-300
  '#9a9fa8',   // 4 — neutral-400
  '#797E85',   // 5 — neutral-500
  '#5e636c',   // 6 — neutral-600
  '#3E616A',   // 7 — neutral-700 (NULogic Muted Teal)
  '#1e2a30',   // 8 — neutral-800
  '#133E49',   // 9 — neutral-900 (NULogic Dark Teal)
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

  // Typography - NULogic (Montserrat headings + Open Sans body)
  fontFamily: 'var(--font-sans), "Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace: 'var(--font-mono), "Roboto Mono", "SF Mono", "Monaco", "Cascadia Code", "Consolas", "Courier New", monospace',

  headings: {
    fontFamily: 'var(--font-display), "Montserrat", var(--font-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

  // Spacing - strict 8px grid (4, 8, 16, 24, 32)
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
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

'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';
import {
  amber,
  grass,
  jade,
  orange,
  sand,
  sky,
  slate,
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

// Primary - Jade (fresh, modern teal)
const primary = toMantineTuple(jade, 'jade');

// Secondary - Slate (neutral foundations)
const secondary = toMantineTuple(slate, 'slate');

// Accent - Orange (warm emphasis)
const accent = toMantineTuple(orange, 'orange');

// Success - Grass
const success = toMantineTuple(grass, 'grass');

// Warning - Amber
const warning = toMantineTuple(amber, 'amber');

// Danger - Tomato
const danger = toMantineTuple(tomato, 'tomato');

// Info - Sky
const info = toMantineTuple(sky, 'sky');

// Surface - Slate (cool neutral background)
const surface = toMantineTuple(slate, 'slate');

export const theme = createTheme({
  colors: {
    primary,
    secondary,
    accent,
    success,
    warning,
    danger,
    info,
    surface,
    // Legacy aliases to keep existing Mantine color props consistent
    blue: info,
    indigo: info,
    violet: accent,
    purple: primary,
    pink: accent,
    teal: primary,
  },

  primaryColor: 'primary',
  primaryShade: { light: 6, dark: 4 },

  fontFamily: 'var(--font-sans), "Space Grotesk", "Manrope", sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  headings: {
    fontFamily: 'var(--font-display), "Fraunces", "DM Serif Display", serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '2.5rem' },
      h2: { fontSize: '1.875rem', lineHeight: '2.25rem' },
      h3: { fontSize: '1.5rem', lineHeight: '2rem' },
      h4: { fontSize: '1.25rem', lineHeight: '1.75rem' },
      h5: { fontSize: '1.125rem', lineHeight: '1.75rem' },
      h6: { fontSize: '1rem', lineHeight: '1.5rem' },
    },
  },

  radius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  defaultRadius: 'md',

  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },

  shadows: {
    xs: '0 1px 2px 0 rgb(15 23 42 / 0.08)',
    sm: '0 2px 6px -1px rgb(15 23 42 / 0.12), 0 1px 2px -1px rgb(15 23 42 / 0.08)',
    md: '0 8px 16px -8px rgb(15 23 42 / 0.2), 0 4px 8px -6px rgb(15 23 42 / 0.12)',
    lg: '0 16px 28px -12px rgb(15 23 42 / 0.28), 0 8px 12px -8px rgb(15 23 42 / 0.16)',
    xl: '0 24px 36px -16px rgb(15 23 42 / 0.32), 0 12px 18px -10px rgb(15 23 42 / 0.2)',
  },

  cursorType: 'pointer',
  focusRing: 'auto',

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 160ms ease-out',
        },
      },
    },
    Input: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
  },
});

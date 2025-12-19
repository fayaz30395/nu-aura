'use client';

import { createTheme, MantineColorsTuple } from '@mantine/core';

// Primary - Modern Blue (matching Tailwind config)
const primary: MantineColorsTuple = [
  '#eff6ff', // 50
  '#dbeafe', // 100
  '#bfdbfe', // 200
  '#93c5fd', // 300
  '#60a5fa', // 400
  '#3b82f6', // 500 - Main primary
  '#2563eb', // 600
  '#1d4ed8', // 700
  '#1e40af', // 800
  '#1e3a8a', // 900
];

// Success - Clean Green
const success: MantineColorsTuple = [
  '#f0fdf4', // 50
  '#dcfce7', // 100
  '#bbf7d0', // 200
  '#86efac', // 300
  '#4ade80', // 400
  '#22c55e', // 500 - Main success
  '#16a34a', // 600
  '#15803d', // 700
  '#166534', // 800
  '#14532d', // 900
];

// Warning - Amber
const warning: MantineColorsTuple = [
  '#fffbeb', // 50
  '#fef3c7', // 100
  '#fde68a', // 200
  '#fcd34d', // 300
  '#fbbf24', // 400
  '#f59e0b', // 500 - Main warning
  '#d97706', // 600
  '#b45309', // 700
  '#92400e', // 800
  '#78350f', // 900
];

// Danger - Red
const danger: MantineColorsTuple = [
  '#fef2f2', // 50
  '#fee2e2', // 100
  '#fecaca', // 200
  '#fca5a5', // 300
  '#f87171', // 400
  '#ef4444', // 500 - Main danger
  '#dc2626', // 600
  '#b91c1c', // 700
  '#991b1b', // 800
  '#7f1d1d', // 900
];

// Info - Cyan
const info: MantineColorsTuple = [
  '#ecfeff', // 50
  '#cffafe', // 100
  '#a5f3fc', // 200
  '#67e8f9', // 300
  '#22d3ee', // 400
  '#06b6d4', // 500 - Main info
  '#0891b2', // 600
  '#0e7490', // 700
  '#155e75', // 800
  '#164e63', // 900
];

// Secondary - Slate (matching Tailwind's surface/secondary)
const secondary: MantineColorsTuple = [
  '#f8fafc', // 50
  '#f1f5f9', // 100
  '#e2e8f0', // 200
  '#cbd5e1', // 300
  '#94a3b8', // 400
  '#64748b', // 500 - Main secondary
  '#475569', // 600
  '#334155', // 700
  '#1e293b', // 800
  '#0f172a', // 900
];

// Surface/Gray colors for backgrounds
const surface: MantineColorsTuple = [
  '#ffffff', // 50 - Pure white
  '#f9fafb', // 100 - Very light gray
  '#f3f4f6', // 200 - Light gray
  '#e5e7eb', // 300 - Border color
  '#9ca3af', // 400 - Placeholder
  '#6b7280', // 500 - Secondary text
  '#4b5563', // 600 - Body text
  '#374151', // 700 - Headings
  '#1f2937', // 800 - Dark mode cards
  '#111827', // 900 - Dark mode background
];

export const theme = createTheme({
  // Use your custom color palette
  colors: {
    primary,
    success,
    warning,
    danger,
    info,
    secondary,
    surface,
  },

  // Set primary color
  primaryColor: 'primary',
  primaryShade: { light: 5, dark: 4 },

  // Font family matching Tailwind config
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  // Heading font weights
  headings: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
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

  // Border radius matching Tailwind
  radius: {
    xs: '0.25rem',  // 4px
    sm: '0.375rem', // 6px - default
    md: '0.5rem',   // 8px
    lg: '0.625rem', // 10px
    xl: '0.75rem',  // 12px
  },
  defaultRadius: 'sm',

  // Spacing
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.25rem',  // 20px
    xl: '1.5rem',   // 24px
  },

  // Shadows matching Tailwind config
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },

  // Cursor pointer on interactive elements
  cursorType: 'pointer',

  // Focus ring style
  focusRing: 'auto',

  // Component specific defaults
  components: {
    Button: {
      defaultProps: {
        radius: 'sm',
      },
      styles: {
        root: {
          fontWeight: 500,
        },
      },
    },
    Input: {
      defaultProps: {
        radius: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Select: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
        shadow: 'xl',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'sm',
        shadow: 'sm',
      },
    },
    Notification: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
});

'use client';

/**
 * NU-AURA — Mantine theme wired to Studio Slate v2 design tokens.
 *
 * This is the canonical Mantine theme for the platform. It bridges
 * `frontend/app/globals.css` CSS variables into Mantine's theme object
 * and component-level style overrides so that <Card>, <Modal>, <Menu>,
 * <Popover>, <TextInput>, <Button> etc. render with the same colors,
 * radii, fonts, and surfaces as native `.card-aura` / `.btn-primary`
 * / `.input-aura` components.
 *
 * Anchor: --accent-primary = #2563EB (Tailwind blue-600).
 * Primary shade swaps to a lighter step in dark mode for visibility
 * on warm-dark surfaces.
 *
 * Color-scheme sync: this file exports only the static theme. Light /
 * dark switching is driven by <MantineProvider forceColorScheme={...}>
 * inside `MantineThemeProvider`, which mirrors the `<html class="dark">`
 * toggle from `DarkModeProvider`.
 */

import {createTheme, MantineColorsTuple} from '@mantine/core';

// ── Studio Slate accent palette (10 steps, anchored on #2563EB) ──────
// Tailwind blue scale. primaryShade picks step 6 in light, 4 in dark
// to match --accent-primary token swap between modes.
const aura: MantineColorsTuple = [
  '#eff6ff', // 0  — accent-50  (lightest, surface tint)
  '#dbeafe', // 1  — accent-100
  '#bfdbfe', // 2  — accent-200
  '#93c5fd', // 3  — accent-300
  '#60a5fa', // 4  — accent-400 (dark-mode primaryShade)
  '#3b82f6', // 5  — accent-500
  '#2563eb', // 6  — accent-600 (light-mode primaryShade = --accent-primary)
  '#1d4ed8', // 7  — accent-700 (hover in light mode)
  '#1e40af', // 8  — accent-800
  '#172554', // 9  — accent-950 (darkest)
];

export const mantineTheme = createTheme({
  // ── Color ───────────────────────────────────────────────────────────
  primaryColor: 'aura',
  primaryShade: {light: 6, dark: 4},
  colors: {
    aura,
    // Backward-compat aliases so any existing `color="accent"` props still resolve
    // to the Studio Slate palette instead of Mantine's default blue.
    accent: aura,
    primary: aura,
  },

  // ── Radius ──────────────────────────────────────────────────────────
  // `md` = 12px matches `.btn-primary` / `.input-aura` / `.card-aura`
  // (`rounded-xl`). Mantine's default is 4px, which is the single
  // biggest visual mismatch with Studio Slate.
  defaultRadius: 'md',
  radius: {
    xs: '0.25rem',   // 4px
    sm: '0.375rem',  // 6px
    md: '0.75rem',   // 12px — Studio Slate default surface radius
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
  },

  // ── Typography ──────────────────────────────────────────────────────
  // Map to the same `next/font` CSS vars set in `app/layout.tsx`.
  fontFamily:
    'var(--font-sans), "Manrope", "Segoe UI", sans-serif',
  fontFamilyMonospace:
    'var(--font-mono), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily:
      'var(--font-sans), "Manrope", var(--font-sans), system-ui, sans-serif',
    fontWeight: '600',
  },

  cursorType: 'pointer',
  focusRing: 'auto',

  // ── Component defaults ──────────────────────────────────────────────
  components: {
    // Form controls — h-9 (36px) compact desktop default.
    Button: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {root: {height: '2.25rem' /* h-9 = 36px */, fontWeight: 600}},
    },
    TextInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {input: {height: '2.25rem'}},
    },
    NumberInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {input: {height: '2.25rem'}},
    },
    PasswordInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {input: {height: '2.25rem'}},
    },
    Select: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {input: {height: '2.25rem'}},
    },
    MultiSelect: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {input: {minHeight: '2.25rem'}},
    },
    Autocomplete: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {input: {height: '2.25rem'}},
    },
    Textarea: {
      defaultProps: {radius: 'md', size: 'sm'},
    },

    // Surfaces — wire to CSS variables so light/dark swap automatically.
    Card: {
      defaultProps: {radius: 'md', withBorder: true, shadow: 'sm'},
      styles: {
        root: {
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    Paper: {
      defaultProps: {radius: 'md', withBorder: true, shadow: 'sm'},
      styles: {
        root: {
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
        overlayProps: {backgroundOpacity: 0.4, blur: 2},
      },
      styles: {
        content: {backgroundColor: 'var(--bg-elevated)'},
        header: {
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
        },
      },
    },
    Drawer: {
      defaultProps: {
        overlayProps: {backgroundOpacity: 0.4, blur: 2},
      },
      styles: {
        content: {backgroundColor: 'var(--bg-elevated)'},
        header: {
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
        },
      },
    },
    Menu: {
      styles: {
        dropdown: {
          backgroundColor: 'var(--dropdown-bg)',
          borderColor: 'var(--dropdown-border)',
        },
        item: {color: 'var(--dropdown-text)'},
      },
    },
    Popover: {
      styles: {
        dropdown: {
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    HoverCard: {
      styles: {
        dropdown: {
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    Tooltip: {
      styles: {
        tooltip: {
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        },
      },
    },
    Notification: {
      defaultProps: {radius: 'md'},
      styles: {
        root: {
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    Divider: {
      styles: {root: {borderColor: 'var(--border-subtle)'}},
    },
  },
});

/** Backward-compat default export for older imports. */
export default mantineTheme;

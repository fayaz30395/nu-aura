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
 * Anchor: --accent-primary = #2952A3 (NU-AURA Blue, hue ~228).
 * Primary shade swaps to a lighter step in dark mode for visibility
 * on warm-dark surfaces.
 *
 * Color-scheme sync: this file exports only the static theme. Light /
 * dark switching is driven by <MantineProvider forceColorScheme={...}>
 * inside `MantineThemeProvider`, which mirrors the `<html class="dark">`
 * toggle from `DarkModeProvider`.
 */

import {ButtonProps, createTheme, MantineColorsTuple, MantineTheme} from '@mantine/core';

// ── Aura accent palette (10 steps, anchored on #2952A3) ──────────────
// NU-AURA Blue (hue ~228). Mirrors --aura-accent-* in app/globals.css.
// primaryShade picks step 7 (#2952A3) in light (= --accent), step 4
// (#6884dc) in dark (= dark --accent), matching the token swap.
const aura: MantineColorsTuple = [
  '#f0f3fc', // 0  — accent-50  (lightest, surface tint)
  '#dce3f8', // 1  — accent-100
  '#bcc9f2', // 2  — accent-200
  '#92a8e8', // 3  — accent-300
  '#6884dc', // 4  — accent-400 (dark-mode primaryShade = dark --accent)
  '#4463cf', // 5  — accent-500
  '#3350b8', // 6  — accent-600
  '#2952A3', // 7  — accent-700 (light-mode primaryShade = --accent / anchor)
  '#244288', // 8  — accent-800 (hover in light mode)
  '#1d356d', // 9  — accent-900 (darkest used)
];

export const mantineTheme = createTheme({
  // ── Color ───────────────────────────────────────────────────────────
  primaryColor: 'aura',
  primaryShade: {light: 7, dark: 4},
  colors: {
    aura,
    // Backward-compat aliases so any existing `color="accent"` props still resolve
    // to the Studio Slate palette instead of Mantine's default blue.
    accent: aura,
    primary: aura,
  },

  // ── Radius (Aura) ───────────────────────────────────────────────────
  // Aura: controls (buttons/inputs) 10px, cards 12px. `defaultRadius:'md'`
  // (10px) applies to Button/TextInput/etc.; Card/Paper/Modal opt into
  // `lg` (12px) via their component defaults below. Mirrors --r-* vars.
  defaultRadius: 'md',
  radius: {
    xs: '0.3125rem', // 5px  — --r-xs
    sm: '0.4375rem', // 7px  — --r-sm
    md: '0.625rem',  // 10px — --r-control (buttons / inputs)
    lg: '0.75rem',   // 12px — --r-lg (cards)
    xl: '1rem',      // 16px — --r-xl
  },

  // ── Typography (Aura) ───────────────────────────────────────────────
  // Map to the same `next/font` CSS vars set in `app/layout.tsx`:
  //   --font-sans = Open Sans, --font-display = Montserrat, --font-mono = Roboto Mono.
  fontFamily:
    'var(--font-sans), "Open Sans", "Segoe UI", sans-serif',
  fontFamilyMonospace:
    'var(--font-mono), "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily:
      'var(--font-display), "Montserrat", var(--font-sans), system-ui, sans-serif',
    fontWeight: '700',
  },

  cursorType: 'pointer',
  focusRing: 'auto',

  // ── Component defaults ──────────────────────────────────────────────
  components: {
    // Form controls — h-9 (36px) compact desktop default.
    Button: {
      defaultProps: {radius: 'md', size: 'sm'},
      // a11y: filled primary buttons carry a white label. The dark-mode primary
      // shade (#6884dc) only reaches ~3.5:1 with white — below WCAG AA. Deepen
      // ONLY the filled-primary fill to the shared --btn-primary-bg token
      // (#4463cf → 5.3:1 in dark, #2952A3 → 7.4:1 in light, unchanged). Other
      // colors (red/green) and variants (light/outline/subtle) are left intact,
      // and accent *text* keeps the brighter shade it needs against dark bg.
      vars: (_theme: MantineTheme, props: ButtonProps) => {
        const isPrimaryColor =
          !props.color || props.color === 'aura' || props.color === 'primary';
        if (props.variant === 'filled' && isPrimaryColor) {
          return {
            root: {
              '--button-bg': 'var(--btn-primary-bg)',
              '--button-hover': 'var(--btn-primary-bg-hover)',
            },
          };
        }
        return {root: {}};
      },
      styles: {
        root: {
          height: '2.25rem',
          fontWeight: 600,
          borderRadius: 'var(--r-control)',
          paddingInline: '1rem',
        },
      },
    },
    ActionIcon: {
      styles: {
        root: {
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    TextInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          height: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    NumberInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          height: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    PasswordInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          height: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    Select: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          height: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    MultiSelect: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          minHeight: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    Autocomplete: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          height: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    Textarea: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          borderRadius: 'var(--r-control)',
        },
      },
    },
    FileInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {
          minHeight: '2.25rem',
          borderRadius: 'var(--r-control)',
        },
      },
    },
    TagsInput: {
      defaultProps: {radius: 'md', size: 'sm'},
      styles: {
        input: {borderRadius: 'var(--r-control)'},
      },
    },
    LoadingOverlay: {
      defaultProps: {overlayProps: {radius: 'md', backgroundOpacity: 0.45, blur: 1}},
    },
    Loader: {
      styles: {
        root: {color: 'var(--accent-primary)'},
      },
    },
    Pagination: {
      styles: {
        control: {
          borderRadius: 'var(--r-control)',
          minWidth: '2rem',
          height: '2rem',
        },
      },
    },
    SegmentedControl: {
      styles: {
        root: {
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--r-control)',
        },
      },
    },

    // Surfaces — wire to CSS variables so light/dark swap automatically.
    Card: {
      // Aura cards = 12px (`lg`).
      defaultProps: {radius: 'lg', withBorder: true, shadow: 'sm'},
      styles: {
        root: {
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    Paper: {
      // Aura cards/surfaces = 12px (`lg`).
      defaultProps: {radius: 'lg', withBorder: true, shadow: 'sm'},
      styles: {
        root: {
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        },
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
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
    Alert: {
      styles: {
        root: {
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
        },
      },
    },
    Badge: {
      defaultProps: {radius: 'sm'},
      styles: {
        root: {
          border: '1px solid var(--border-subtle)',
          fontWeight: 600,
          lineHeight: 1.25,
        },
      },
    },
    Table: {
      defaultProps: {
        striped: false,
        highlightOnHover: true,
        withColumnBorders: false,
        withTableBorder: true,
        verticalSpacing: 'sm',
      },
      styles: {
        table: {
          tableLayout: 'fixed',
          width: '100%',
        },
        th: {
          color: 'var(--text-muted)',
          fontWeight: 600,
        },
        tbody: {
          backgroundColor: 'var(--bg-card)',
        },
      },
    },
    AppShell: {
      styles: {
        main: {
          paddingInline: 'var(--s-4)',
        },
      },
    },
    Tabs: {
      styles: {
        list: {
          borderBottomColor: 'var(--border-subtle)',
        },
        tab: {
          color: 'var(--text-secondary)',
          '&[data-active]': {
            color: 'var(--text-primary)',
            fontWeight: 600,
          },
        },
      },
    },
  },
});

/** Backward-compat default export for older imports. */
export default mantineTheme;

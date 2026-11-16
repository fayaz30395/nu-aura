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
 * Anchor: --accent-primary = #2563EB (refined blue).
 * Primary shade swaps to a lighter step in dark mode for visibility
 * on warm-dark surfaces.
 *
 * Color-scheme sync: this file exports only the static theme. Light /
 * dark switching is driven by <MantineProvider forceColorScheme={...}>
 * inside `MantineThemeProvider`, which mirrors the `<html class="dark">`
 * toggle from `DarkModeProvider`.
 */

import {
  ActionIconProps,
  ButtonProps,
  createTheme,
  InputProps,
  MantineColorsTuple,
  MantineTheme,
} from '@mantine/core';

// Contract control heights (--control-sm/md/lg = 32/36/40). Mantine's size
// names are offset by one: the app-wide default Mantine size is `sm`, which is
// the contract's default `md` (36px). Unlisted sizes keep Mantine defaults.
const CONTROL_HEIGHT: Record<string, string> = {
  xs: 'var(--control-sm)',
  sm: 'var(--control-md)',
  md: 'var(--control-lg)',
};

function controlHeight(size: unknown): string | undefined {
  return typeof size === 'string' ? CONTROL_HEIGHT[size] : undefined;
}

// ── Accent palette (10 steps, refined blue around #2563EB) ──
// Mirrors --aura-accent-50..900 in app/globals.css. primaryShade: step 6
// (#2563eb, white label 5.2:1) in light, step 4 (#6ea8fe) in dark = --accent.
const aura: MantineColorsTuple = [
  '#eff4ff', '#dbe7fe', '#bfd3fd', '#93b4fa', '#6ea8fe',
  '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
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

  // ── Radius — reads the contract --radius-* vars in app/globals.css ──
  // Controls use `md` (default), cards/panels `lg`, modals/drawers `xl`.
  defaultRadius: 'md',
  radius: {
    xs: 'var(--r-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },

  // ── Typography (Aura) ───────────────────────────────────────────────
  // Map to the same `next/font` CSS vars set in `app/layout.tsx`:
  //   --font-sans = Geist, --font-display = Geist, --font-mono = Geist Mono.
  fontFamily:
    'var(--font-sans), system-ui, -apple-system, "Segoe UI", sans-serif',
  fontFamilyMonospace:
    'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily:
      'var(--font-display), system-ui, -apple-system, "Segoe UI", sans-serif',
    fontWeight: '600',
    sizes: {
      h1: {fontSize: 'var(--font-size-title)', lineHeight: 'var(--line-height-title)'},
      h2: {fontSize: 'var(--font-size-xl)', lineHeight: 'var(--line-height-xl)'},
      h3: {fontSize: 'var(--font-size-xl)', lineHeight: 'var(--line-height-xl)'},
    },
  },

  cursorType: 'pointer',
  focusRing: 'auto',

  // ── Component defaults ──────────────────────────────────────────────
  components: {
    // Form controls — Mantine `sm` = contract default 36px; heights follow
    // CONTROL_HEIGHT per size, radius follows the `radius` prop (default md).
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
        const height = {'--button-height': controlHeight(props.size)};
        if (props.variant === 'filled' && isPrimaryColor) {
          return {
            root: {
              ...height,
              '--button-bg': 'var(--btn-primary-bg)',
              '--button-hover': 'var(--btn-primary-bg-hover)',
            },
          };
        }
        return {root: height};
      },
      styles: {
        root: {
          fontWeight: 500,
          paddingInline: '1rem',
          transition: 'background-color 150ms, border-color 150ms, color 150ms',
        },
        label: {overflow: 'visible'},
      },
    },
    // Contract icon button: 32x32 at the default size.
    ActionIcon: {
      vars: (_theme: MantineTheme, props: ActionIconProps) => ({
        root: {'--ai-size': props.size === undefined || props.size === 'md' ? 'var(--control-sm)' : undefined},
      }),
      styles: {
        root: {
          border: '1px solid var(--border-subtle)',
        },
      },
    },
    // Applies to every Input-based component (TextInput, Select, NumberInput, …).
    Input: {
      vars: (_theme: MantineTheme, props: InputProps) => ({
        wrapper: {'--input-height': controlHeight(props.size)},
      }),
      styles: {
        input: {
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border-main)',
          color: 'var(--text-primary)',
          transition: 'border-color 150ms, box-shadow 150ms',
        },
      },
    },
    InputWrapper: {
      styles: {
        label: {fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4},
        description: {fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginBottom: 0},
        error: {fontSize: 12, color: 'var(--err-fg)', marginTop: 4},
      },
    },
    Checkbox: {
      defaultProps: {radius: 'sm', size: 'sm'},
      styles: {label: {fontSize: 14, color: 'var(--text-primary)'}},
    },
    Radio: {
      defaultProps: {size: 'sm'},
      styles: {label: {fontSize: 14, color: 'var(--text-primary)'}},
    },
    Switch: {
      defaultProps: {size: 'sm'},
      styles: {label: {fontSize: 14, color: 'var(--text-primary)'}},
    },
    TextInput: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    NumberInput: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    PasswordInput: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    Select: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    MultiSelect: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    Autocomplete: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    // @mantine/dates inputs extend Input, so height/border/focus come from the
    // Input theme above; popover + calendar visuals live in globals.css (.mantine-Day-day).
    DateInput: {
      defaultProps: {radius: 'md', size: 'sm', popoverProps: {shadow: 'md', radius: 'md'}},
    },
    DatePickerInput: {
      defaultProps: {radius: 'md', size: 'sm', popoverProps: {shadow: 'md', radius: 'md'}},
    },
    DateTimePicker: {
      defaultProps: {radius: 'md', size: 'sm', popoverProps: {shadow: 'md', radius: 'md'}},
    },
    MonthPickerInput: {
      defaultProps: {radius: 'md', size: 'sm', popoverProps: {shadow: 'md', radius: 'md'}},
    },
    TimeInput: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    Textarea: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    FileInput: {
      defaultProps: {radius: 'md', size: 'sm'},
    },
    TagsInput: {
      defaultProps: {radius: 'md', size: 'sm'},
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
          minWidth: 'var(--control-sm)',
          height: 'var(--control-sm)',
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
        radius: 'xl',
        padding: 24,
        transitionProps: {duration: 220, transition: 'pop'},
        overlayProps: {color: 'var(--overlay)', backgroundOpacity: 1, blur: 0},
      },
      styles: {
        content: {backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--sh-overlay)'},
        header: {
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
        },
        title: {fontWeight: 600, fontSize: 18, color: 'var(--text-primary)'},
      },
    },
    Drawer: {
      defaultProps: {
        padding: 24,
        transitionProps: {duration: 220},
        overlayProps: {color: 'var(--overlay)', backgroundOpacity: 1, blur: 0},
      },
      styles: {
        content: {backgroundColor: 'var(--bg-elevated)', boxShadow: 'var(--sh-overlay)'},
        title: {fontWeight: 600, fontSize: 18, color: 'var(--text-primary)'},
        header: {
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
        },
      },
    },
    Menu: {
      defaultProps: {radius: 'md', shadow: 'md'},
      styles: {
        dropdown: {
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--sh-overlay)',
          padding: 4,
        },
        item: {color: 'var(--dropdown-text)', borderRadius: 'var(--radius-sm)'},
      },
    },
    Combobox: {
      defaultProps: {radius: 'md', shadow: 'md'},
      styles: {
        dropdown: {
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--sh-overlay)',
        },
        option: {borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)'},
      },
    },
    Popover: {
      defaultProps: {radius: 'md', shadow: 'md'},
      styles: {
        dropdown: {
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--sh-overlay)',
        },
      },
    },
    HoverCard: {
      styles: {
        dropdown: {
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--sh-overlay)',
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
          fontWeight: 500,
          lineHeight: 1.25,
          textTransform: 'none',
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
          fontWeight: 500,
        },
      },
    },
  },
});

/** Backward-compat default export for older imports. */
export default mantineTheme;

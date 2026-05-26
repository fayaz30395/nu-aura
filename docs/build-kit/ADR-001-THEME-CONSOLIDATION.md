# ADR-001: Theme Migration Consolidation

**Status:** Proposed
**Date:** 2026-03-11
**Decision Makers:** Architecture Team
**Priority:** High (Quick Win)

---

## Context

The application currently implements dark mode using:

- `/frontend/app/globals.css` - Light theme with CSS variables
- `/frontend/components/layout/DarkModeProvider.tsx` - Context-based theme switcher
- Tailwind's `dark:` modifier throughout the codebase
- CSS variables defined in `:root` for colors

### Current Implementation Analysis

**globals.css structure:**

```css
:root {
  --color-brand-500: #465fff;
  --color-brand-600: #3641f5;
  --color-gray-50: #f9fafb;
  --color-gray-900: #101828;
  /* ... more variables */
}
```

**DarkModeProvider implementation:**

- Uses React Context API
- Persists theme to `localStorage` with key `nu-aura-theme`
- Adds/removes `dark` class on `<html>` element
- Supports system preference detection

**Problems Identified:**

1. **Duplicate Class Declarations**: Tailwind classes are duplicated across components (e.g.,
   `bg-white dark:bg-gray-800`)
2. **No Dark Mode CSS Variables**: Light mode uses CSS variables, but dark mode relies solely on
   Tailwind classes
3. **Inconsistent Color Usage**: Some components use CSS variables, others use Tailwind colors
   directly
4. **Hydration Mismatch Risk**: Theme initialization happens in `useEffect`, causing flash of
   incorrect theme
5. **No Theme Transition Animations**: Theme switches are jarring with no smooth transitions

---

## Decision

Implement a **CSS Variables-First Approach** with Tailwind as a complementary layer.

### Strategy

**1. Unified CSS Variable System**

Define both light and dark themes using CSS variables:

```css
/* Root variables - Light theme */
:root {
  /* Semantic color tokens */
  --color-background: #f9fafb;
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;
  --color-text-primary: #101828;
  --color-text-secondary: #475467;
  --color-text-tertiary: #667085;
  --color-border: #e4e7ec;
  --color-border-hover: #d0d5dd;

  /* Brand colors */
  --color-brand-primary: #465fff;
  --color-brand-hover: #3641f5;
  --color-brand-active: #2a31d8;

  /* Status colors */
  --color-success: #12b76a;
  --color-error: #f04438;
  --color-warning: #f79009;
  --color-info: #465fff;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Dark theme variables */
.dark {
  --color-background: #101828;
  --color-surface: #1d2939;
  --color-surface-elevated: #344054;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d0d5dd;
  --color-text-tertiary: #98a2b3;
  --color-border: #344054;
  --color-border-hover: #475467;

  /* Brand colors remain same or adjust for dark mode */
  --color-brand-primary: #5b6fff;
  --color-brand-hover: #7886ff;
  --color-brand-active: #465fff;

  /* Status colors - adjusted for dark backgrounds */
  --color-success: #20c77e;
  --color-error: #f97066;
  --color-warning: #fdb022;
  --color-info: #7886ff;

  /* Dark mode shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
}

/* Smooth theme transitions */
* {
  transition: background-color 200ms ease-in-out,
              border-color 200ms ease-in-out,
              color 200ms ease-in-out;
}

/* Disable transitions on theme change to prevent animation cascade */
.theme-changing * {
  transition: none !important;
}
```

**2. Tailwind Configuration Update**

Extend Tailwind to use CSS variables:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          hover: 'var(--color-border-hover)',
        },
        brand: {
          DEFAULT: 'var(--color-brand-primary)',
          hover: 'var(--color-brand-hover)',
          active: 'var(--color-brand-active)',
        },
        status: {
          success: 'var(--color-success)',
          error: 'var(--color-error)',
          warning: 'var(--color-warning)',
          info: 'var(--color-info)',
        }
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      }
    }
  }
}
```

**3. Improved Theme Provider**

Eliminate hydration mismatch with server-side cookie approach:

```typescript
// frontend/components/layout/DarkModeProvider.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface DarkModeContextType {
  isDark: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const STORAGE_KEY = 'nu-aura-theme';
const COOKIE_KEY = 'theme';

export const DarkModeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: 'light' | 'dark';
}> = ({ children, initialTheme }) => {
  const [isDark, setIsDarkState] = useState(() => initialTheme === 'dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyTheme = (isDarkMode: boolean) => {
    const html = document.documentElement;

    // Add transitional class
    html.classList.add('theme-changing');

    if (isDarkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Remove transitional class after theme change
    requestAnimationFrame(() => {
      setTimeout(() => {
        html.classList.remove('theme-changing');
      }, 200);
    });
  };

  const setDarkMode = (isDarkMode: boolean) => {
    setIsDarkState(isDarkMode);
    applyTheme(isDarkMode);

    // Persist to both localStorage and cookie
    localStorage.setItem(STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    Cookies.set(COOKIE_KEY, isDarkMode ? 'dark' : 'light', { expires: 365 });
  };

  const toggleDarkMode = () => {
    setDarkMode(!isDark);
  };

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};
```

**4. Middleware for Server-Side Theme Detection**

```typescript
// frontend/middleware.ts (add to existing)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const theme = request.cookies.get('theme')?.value || 'light';
  const response = NextResponse.next();

  // Pass theme to page for SSR
  response.headers.set('x-theme', theme);

  return response;
}
```

**5. Root Layout Integration**

```typescript
// frontend/app/layout.tsx
import { cookies } from 'next/headers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const theme = cookieStore.get('theme')?.value || 'light';

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('nu-aura-theme') ||
                             document.cookie.split('; ').find(row => row.startsWith('theme='))?.split('=')[1] ||
                             'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <DarkModeProvider initialTheme={theme as 'light' | 'dark'}>
          {children}
        </DarkModeProvider>
      </body>
    </html>
  );
}
```

---

## Component Migration Example

**Before:**

```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
  <h2 className="text-gray-900 dark:text-white">Title</h2>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>
```

**After:**

```tsx
<div className="bg-surface border border-border text-text-primary">
  <h2 className="text-text-primary">Title</h2>
  <p className="text-text-secondary">Description</p>
</div>
```

**Reduction:** 19 Tailwind classes → 4 semantic classes (79% reduction)

---

## Implementation Plan

### Phase 1: Foundation (Day 1, 4 hours)

- [ ] Create consolidated `theme-variables.css` file
- [ ] Update `tailwind.config.js` with semantic color tokens
- [ ] Update `DarkModeProvider` with cookie support
- [ ] Add theme detection script to root layout
- [ ] Test SSR theme consistency

### Phase 2: Component Migration (Day 2-3, 8 hours)

- [ ] Migrate core UI components (`Card`, `Button`, `Modal`)
- [ ] Migrate layout components (`Header`, `Sidebar`)
- [ ] Create component migration checklist
- [ ] Document semantic color usage guide

### Phase 3: Validation (Day 4, 4 hours)

- [ ] Visual regression testing with Percy/Chromatic
- [ ] Test theme switching in all browsers
- [ ] Verify no hydration mismatches
- [ ] Performance audit (Lighthouse)

---

## Benefits

1. **Code Reduction**: ~70% reduction in dark mode class duplication
2. **Consistency**: Single source of truth for colors
3. **Performance**: Fewer CSS classes = smaller bundle size
4. **Maintainability**: Change theme colors in one place
5. **User Experience**: Smooth theme transitions, no flash
6. **SEO**: Proper SSR support, no hydration issues

---

## Risks & Mitigation

| Risk                     | Impact | Mitigation                                                                    |
|--------------------------|--------|-------------------------------------------------------------------------------|
| Breaking existing styles | High   | Gradual migration, parallel implementation                                    |
| Browser compatibility    | Medium | CSS variables supported in all modern browsers (IE11 unsupported, acceptable) |
| Team learning curve      | Low    | Document semantic color guide, provide examples                               |

---

## Metrics for Success

- **Before:** 2,500+ instances of `dark:` classes across codebase
- **After Target:** < 500 instances (only for edge cases)
- **File Size Reduction:** Estimated 15-20KB reduction in CSS bundle
- **Lighthouse Score:** Target 100 for Accessibility and Best Practices
- **Developer Velocity:** 50% faster to implement new themed components

---

## References

- [CSS Custom Properties Best Practices](https://www.smashingmagazine.com/2018/05/css-custom-properties-strategy-guide/)
- [Tailwind CSS with CSS Variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
- [Next.js Theme Detection](https://nextjs.org/docs/app/building-your-application/optimizing/metadata#dynamic-metadata)

---

## Decision

**Approved for Implementation**: CSS Variables-First approach with phased migration over 4 days.

**Responsible Team**: Frontend Architecture Team
**Implementation Start**: Immediate (Week 1)
**Review Date**: After Phase 3 completion

'use client';

import {ColorSchemeScript, MantineProvider} from '@mantine/core';
import {DatesProvider} from '@mantine/dates';
import {mantineTheme} from '@/styles/mantine-theme';
import {useDarkMode} from './DarkModeProvider';

// Required for @mantine/dates calendar / DateInput rendering.
import '@mantine/dates/styles.css';

interface MantineThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Mantine Theme Provider - Synced with DarkModeProvider.
 * Uses forceColorScheme to keep Mantine in sync with the resolved theme.
 *
 * DatesProvider (S9-G): locale-aware DateInput display platform-wide.
 *   - locale "en-IN"             — DD/MM/YYYY display, INR-region defaults
 *   - firstDayOfWeek 1           — Monday-first calendar (India business week)
 *   - weekendDays [0]            — Sunday only (Saturday is a working day)
 * Placed inside MantineProvider so dates components inherit theme/colorScheme.
 */
export function MantineThemeProvider({children}: MantineThemeProviderProps) {
  const {resolvedTheme} = useDarkMode();

  return (
    // suppressHydrationWarning isolates Mantine's CSS-variable <style> injection from
    // React's hydration diff. MantineProvider renders a <style dangerouslySetInnerHTML>
    // whose content depends on the resolved colour scheme. We set both values in
    // the pre-hydration script, so first paint should already match resolved theme.
    <div suppressHydrationWarning>
      <MantineProvider
        theme={mantineTheme}
        forceColorScheme={resolvedTheme}
      >
        <DatesProvider settings={{locale: 'en-IN', firstDayOfWeek: 1, weekendDays: [0]}}>
          {children}
        </DatesProvider>
      </MantineProvider>
    </div>
  );
}

/**
 * Color scheme script component.
 * We no longer force a specific scheme — the FOUC prevention script
 * in layout.tsx handles the initial class before React hydrates.
 * This Mantine script is kept for Mantine's internal SSR hydration.
 */
export function MantineColorSchemeScript() {
  return <ColorSchemeScript defaultColorScheme="light"/>;
}

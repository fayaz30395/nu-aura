/**
 * Theme color utilities for chart components
 * Maps CSS variable names to hex values for use in charts (Recharts, etc.)
 * Uses fallback values for SSR compatibility
 */

const getCSSVariable = (varName: string, fallback: string): string => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
};

export const chartColors = {
  /**
   * Primary chart colors - maps to Recharts color palette
   */
  primary: () => getCSSVariable('--chart-primary', '#3e63dd'),
  secondary: () => getCSSVariable('--chart-secondary', '#8b5cf6'),
  success: () => getCSSVariable('--chart-success', '#10b981'),
  warning: () => getCSSVariable('--chart-warning', '#f59e0b'),
  danger: () => getCSSVariable('--chart-danger', '#ef4444'),
  info: () => getCSSVariable('--chart-info', '#3b82f6'),
  accent: () => getCSSVariable('--chart-accent', '#f97316'),
  muted: () => getCSSVariable('--chart-muted', '#9ca3af'),

  /**
   * Chart infrastructure colors
   */
  grid: () => getCSSVariable('--chart-grid', '#e5e7eb'),
  tooltipBg: () => getCSSVariable('--chart-tooltip-bg', '#ffffff'),
  tooltipBorder: () => getCSSVariable('--chart-tooltip-border', '#e5e7eb'),
  tooltipText: () => getCSSVariable('--chart-tooltip-text', '#111827'),

  /**
   * Palette for multi-series charts
   */
  palette: (): string[] => [
    chartColors.primary(),
    chartColors.secondary(),
    chartColors.success(),
    chartColors.warning(),
    chartColors.danger(),
    chartColors.info(),
    chartColors.accent(),
  ],
};

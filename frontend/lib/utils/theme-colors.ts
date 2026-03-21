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
  primary: () => getCSSVariable('--chart-primary', '#0d9488'),
  secondary: () => getCSSVariable('--chart-secondary', '#2563eb'),
  success: () => getCSSVariable('--chart-success', '#16a34a'),
  warning: () => getCSSVariable('--chart-warning', '#f59e0b'),
  danger: () => getCSSVariable('--chart-danger', '#dc2626'),
  info: () => getCSSVariable('--chart-info', '#1d4ed8'),
  accent: () => getCSSVariable('--chart-accent', '#f97316'),
  muted: () => getCSSVariable('--chart-muted', '#c4b9a7'),

  /**
   * Chart infrastructure colors
   */
  grid: () => getCSSVariable('--chart-grid', '#ede6d9'),
  tooltipBg: () => getCSSVariable('--chart-tooltip-bg', '#ffffff'),
  tooltipBorder: () => getCSSVariable('--chart-tooltip-border', '#e3dcd1'),
  tooltipText: () => getCSSVariable('--chart-tooltip-text', '#1c1b19'),

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

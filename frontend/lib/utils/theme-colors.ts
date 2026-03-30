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
  primary: () => getCSSVariable('--chart-primary', '#050766'),
  secondary: () => getCSSVariable('--chart-secondary', '#8939A1'),
  success: () => getCSSVariable('--chart-success', '#16a34a'),
  warning: () => getCSSVariable('--chart-warning', '#f59e0b'),
  danger: () => getCSSVariable('--chart-danger', '#E62A32'),
  info: () => getCSSVariable('--chart-info', '#61629D'),
  accent: () => getCSSVariable('--chart-accent', '#EE777C'),
  muted: () => getCSSVariable('--chart-muted', '#c0c3c8'),

  /**
   * Chart infrastructure colors
   */
  grid: () => getCSSVariable('--chart-grid', '#d8dadd'),
  tooltipBg: () => getCSSVariable('--chart-tooltip-bg', '#ffffff'),
  tooltipBorder: () => getCSSVariable('--chart-tooltip-border', '#c0c3c8'),
  tooltipText: () => getCSSVariable('--chart-tooltip-text', '#050766'),

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

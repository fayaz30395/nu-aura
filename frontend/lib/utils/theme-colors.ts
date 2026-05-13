/**
 * Theme color utilities for chart components.
 * Maps CSS variable names to hex values for use in charts (Recharts, etc.).
 * Uses fallback values for SSR compatibility — fallbacks track Studio Slate v2.
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
   * Primary chart colors — Studio Slate v2 palette.
   * Fallbacks match `--chart-*` tokens in `frontend/app/globals.css`.
   */
  primary: () => getCSSVariable('--chart-primary', '#2563EB'),
  secondary: () => getCSSVariable('--chart-secondary', '#60a5fa'),
  success: () => getCSSVariable('--chart-success', '#16a34a'),
  warning: () => getCSSVariable('--chart-warning', '#d97706'),
  danger: () => getCSSVariable('--chart-danger', '#dc2626'),
  info: () => getCSSVariable('--chart-info', '#3b82f6'),
  accent: () => getCSSVariable('--chart-accent', '#93c5fd'),
  muted: () => getCSSVariable('--chart-muted', '#b8bccf'),

  /**
   * Chart infrastructure colors.
   */
  grid: () => getCSSVariable('--chart-grid', '#eceef5'),
  tooltipBg: () => getCSSVariable('--chart-tooltip-bg', '#ffffff'),
  tooltipBorder: () => getCSSVariable('--chart-tooltip-border', '#dfe2ed'),
  tooltipText: () => getCSSVariable('--chart-tooltip-text', '#1c2033'),

  /**
   * Palette for multi-series charts.
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

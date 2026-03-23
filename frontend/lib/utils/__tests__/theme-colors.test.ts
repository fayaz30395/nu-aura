import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chartColors } from '../theme-colors';

describe('theme-colors', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('chartColors individual color getters', () => {
    it('primary returns fallback when window is undefined', () => {
      const color = chartColors.primary();
      expect(color).toBe('#0057FF');
    });

    it('secondary returns fallback when window is undefined', () => {
      const color = chartColors.secondary();
      expect(color).toBe('#4D8AFF');
    });

    it('success returns fallback', () => {
      const color = chartColors.success();
      expect(color).toBe('#16a34a');
    });

    it('warning returns fallback', () => {
      const color = chartColors.warning();
      expect(color).toBe('#f59e0b');
    });

    it('danger returns fallback', () => {
      const color = chartColors.danger();
      expect(color).toBe('#dc2626');
    });

    it('info returns fallback', () => {
      const color = chartColors.info();
      expect(color).toBe('#1d4ed8');
    });

    it('accent returns fallback', () => {
      const color = chartColors.accent();
      expect(color).toBe('#f97316');
    });

    it('muted returns fallback', () => {
      const color = chartColors.muted();
      expect(color).toBe('#DCDCDC');
    });
  });

  describe('chartColors infrastructure colors', () => {
    it('grid returns fallback', () => {
      const color = chartColors.grid();
      expect(color).toBe('#E8E8E8');
    });

    it('tooltipBg returns fallback', () => {
      const color = chartColors.tooltipBg();
      expect(color).toBe('#ffffff');
    });

    it('tooltipBorder returns fallback', () => {
      const color = chartColors.tooltipBorder();
      expect(color).toBe('#DCDCDC');
    });

    it('tooltipText returns fallback', () => {
      const color = chartColors.tooltipText();
      expect(color).toBe('#191919');
    });
  });

  describe('chartColors palette', () => {
    it('palette returns array of 7 colors', () => {
      const palette = chartColors.palette();
      expect(Array.isArray(palette)).toBe(true);
      expect(palette.length).toBe(7);
    });

    it('palette contains all primary colors', () => {
      const palette = chartColors.palette();
      expect(palette[0]).toBe('#0057FF'); // primary
      expect(palette[1]).toBe('#4D8AFF'); // secondary
      expect(palette[2]).toBe('#16a34a'); // success
      expect(palette[3]).toBe('#f59e0b'); // warning
      expect(palette[4]).toBe('#dc2626'); // danger
      expect(palette[5]).toBe('#1d4ed8'); // info
      expect(palette[6]).toBe('#f97316'); // accent
    });

    it('palette returns consistent values across calls', () => {
      const palette1 = chartColors.palette();
      const palette2 = chartColors.palette();
      expect(palette1).toEqual(palette2);
    });
  });

  describe('color consistency', () => {
    it('all colors are valid hex values', () => {
      const colors = [
        chartColors.primary(),
        chartColors.secondary(),
        chartColors.success(),
        chartColors.warning(),
        chartColors.danger(),
        chartColors.info(),
        chartColors.accent(),
        chartColors.muted(),
        chartColors.grid(),
        chartColors.tooltipBg(),
        chartColors.tooltipBorder(),
        chartColors.tooltipText(),
      ];

      colors.forEach((color) => {
        // Valid hex color format
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('palette colors match individual getters', () => {
      const palette = chartColors.palette();
      expect(palette[0]).toBe(chartColors.primary());
      expect(palette[1]).toBe(chartColors.secondary());
      expect(palette[2]).toBe(chartColors.success());
      expect(palette[3]).toBe(chartColors.warning());
      expect(palette[4]).toBe(chartColors.danger());
      expect(palette[5]).toBe(chartColors.info());
      expect(palette[6]).toBe(chartColors.accent());
    });
  });

  describe('color usage patterns', () => {
    it('can use primary and secondary together', () => {
      const primaryColor = chartColors.primary();
      const secondaryColor = chartColors.secondary();
      expect(primaryColor).not.toBe(secondaryColor);
      expect(primaryColor.length).toBe(7);
      expect(secondaryColor.length).toBe(7);
    });

    it('can use success, warning, danger together for status indicators', () => {
      const statusColors = {
        success: chartColors.success(),
        warning: chartColors.warning(),
        danger: chartColors.danger(),
      };
      expect(statusColors.success).toBe('#16a34a');
      expect(statusColors.warning).toBe('#f59e0b');
      expect(statusColors.danger).toBe('#dc2626');
    });

    it('can access tooltip styling colors together', () => {
      const tooltipStyles = {
        bg: chartColors.tooltipBg(),
        border: chartColors.tooltipBorder(),
        text: chartColors.tooltipText(),
      };
      expect(tooltipStyles.bg).toBe('#ffffff');
      expect(tooltipStyles.border).toBe('#DCDCDC');
      expect(tooltipStyles.text).toBe('#191919');
    });
  });

  describe('SSR compatibility', () => {
    it('functions are safe to call on server (window undefined)', () => {
      // This test verifies the implementation handles undefined window
      // The actual implementation checks for window === 'undefined'
      expect(() => chartColors.primary()).not.toThrow();
      expect(() => chartColors.palette()).not.toThrow();
    });

    it('returns fallback values consistently', () => {
      const colors1 = chartColors.palette();
      const colors2 = chartColors.palette();
      expect(colors1).toEqual(colors2);
    });
  });
});

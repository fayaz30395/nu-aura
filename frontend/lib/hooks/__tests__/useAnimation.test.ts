import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as framerMotionModule from 'framer-motion';
import {
  useInView,
  useScrollProgress,
  useStaggerDelay,
  usePreferReducedMotion,
  useAnimationState,
  useStaggerAnimation,
  useHoverAnimation,
  useFadeInClass,
} from '../useAnimation';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('useAnimation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInView', () => {
    it('returns ref and isInView state', () => {
      const { result } = renderHook(() => useInView());
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toHaveProperty('current');
      expect(typeof result.current[1]).toBe('boolean');
    });

    it('returns false initially', () => {
      const { result } = renderHook(() => useInView());
      expect(result.current[1]).toBe(false);
    });

    it('accepts options', () => {
      const { result } = renderHook(() =>
        useInView({
          threshold: 0.5,
          triggerOnce: false,
          delay: 100,
          enabled: true,
        })
      );
      expect(result.current[1]).toBe(false);
    });

    it('respects enabled flag', () => {
      const { result } = renderHook(() => useInView({ enabled: false }));
      expect(result.current[1]).toBe(true); // Should be true when disabled
    });

    it('respects reduced motion preference', () => {
      vi.mocked(framerMotionModule.useReducedMotion).mockReturnValue(true);
      const { result } = renderHook(() => useInView());
      expect(result.current[1]).toBe(true); // Should be true when reduced motion
    });
  });

  describe('useScrollProgress', () => {
    it('returns ref and progress state', () => {
      const { result } = renderHook(() => useScrollProgress());
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toHaveProperty('current');
      expect(typeof result.current[1]).toBe('number');
    });

    it('initializes progress to 0', () => {
      const { result } = renderHook(() => useScrollProgress());
      expect(result.current[1]).toBe(0);
    });

    it('progress is between 0 and 1', () => {
      const { result } = renderHook(() => useScrollProgress());
      expect(result.current[1]).toBeGreaterThanOrEqual(0);
      expect(result.current[1]).toBeLessThanOrEqual(1);
    });
  });

  describe('useStaggerDelay', () => {
    it('returns delay based on index', () => {
      vi.mocked(framerMotionModule.useReducedMotion).mockReturnValue(false);
      const { result: result0 } = renderHook(() => useStaggerDelay(0));
      const { result: result1 } = renderHook(() => useStaggerDelay(1));
      const { result: result2 } = renderHook(() => useStaggerDelay(2));

      expect(result0.current).toBe(0);
      expect(result1.current).toBe(50);
      expect(result2.current).toBe(100);
    });

    it('accepts custom base delay', () => {
      vi.mocked(framerMotionModule.useReducedMotion).mockReturnValue(false);
      const { result: result0 } = renderHook(() => useStaggerDelay(0, 100));
      const { result: result1 } = renderHook(() => useStaggerDelay(1, 100));

      expect(result0.current).toBe(0);
      expect(result1.current).toBe(100);
    });

    it('returns 0 when reduced motion is preferred', () => {
      vi.mocked(framerMotionModule.useReducedMotion).mockReturnValue(true);
      const { result } = renderHook(() => useStaggerDelay(5, 100));
      expect(result.current).toBe(0);
    });
  });

  describe('usePreferReducedMotion', () => {
    it('returns boolean', () => {
      const { result } = renderHook(() => usePreferReducedMotion());
      expect(typeof result.current).toBe('boolean');
    });

    it('returns false when motion not reduced', () => {
      vi.mocked(framerMotionModule.useReducedMotion).mockReturnValue(false);
      const { result } = renderHook(() => usePreferReducedMotion());
      expect(result.current).toBe(false);
    });

    it('returns true when motion is reduced', () => {
      vi.mocked(framerMotionModule.useReducedMotion).mockReturnValue(true);
      const { result } = renderHook(() => usePreferReducedMotion());
      expect(result.current).toBe(true);
    });
  });

  describe('useAnimationState', () => {
    it('initializes with false state', () => {
      const { result } = renderHook(() => useAnimationState());
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.hasAnimated).toBe(false);
    });

    it('initializes with custom initial state', () => {
      const { result } = renderHook(() => useAnimationState(true));
      expect(result.current.isAnimating).toBe(true);
    });

    it('startAnimation sets animating and hasAnimated', () => {
      const { result } = renderHook(() => useAnimationState());
      act(() => {
        result.current.startAnimation();
      });
      expect(result.current.isAnimating).toBe(true);
      expect(result.current.hasAnimated).toBe(true);
    });

    it('stopAnimation clears animating state', () => {
      const { result } = renderHook(() => useAnimationState());
      act(() => {
        result.current.startAnimation();
        result.current.stopAnimation();
      });
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.hasAnimated).toBe(true);
    });

    it('resetAnimation clears both states', () => {
      const { result } = renderHook(() => useAnimationState());
      act(() => {
        result.current.startAnimation();
        result.current.resetAnimation();
      });
      expect(result.current.isAnimating).toBe(false);
      expect(result.current.hasAnimated).toBe(false);
    });
  });

  describe('useStaggerAnimation', () => {
    it('returns ref and array of booleans', () => {
      const { result } = renderHook(() => useStaggerAnimation(3));
      expect(result.current).toHaveLength(2);
      expect(Array.isArray(result.current[1])).toBe(true);
      expect(result.current[1].length).toBe(3);
    });

    it('initializes items array with correct length', () => {
      const { result } = renderHook(() => useStaggerAnimation(5));
      expect(result.current[1]).toHaveLength(5);
      // In test environment without real DOM, items may be immediately visible
      result.current[1].forEach((item) => {
        expect(typeof item).toBe('boolean');
      });
    });

    it('accepts count parameter', () => {
      const { result: result3 } = renderHook(() => useStaggerAnimation(3));
      const { result: result5 } = renderHook(() => useStaggerAnimation(5));

      expect(result3.current[1].length).toBe(3);
      expect(result5.current[1].length).toBe(5);
    });

    it('accepts custom base delay', () => {
      const { result } = renderHook(() =>
        useStaggerAnimation(3, { baseDelay: 200 })
      );
      expect(result.current[1].length).toBe(3);
    });
  });

  describe('useHoverAnimation', () => {
    it('returns hover state and props', () => {
      const { result } = renderHook(() => useHoverAnimation());
      expect(result.current).toHaveProperty('isHovered');
      expect(result.current).toHaveProperty('hoverProps');
    });

    it('initializes isHovered as false', () => {
      const { result } = renderHook(() => useHoverAnimation());
      expect(result.current.isHovered).toBe(false);
    });

    it('provides onMouseEnter and onMouseLeave handlers', () => {
      const { result } = renderHook(() => useHoverAnimation());
      expect(result.current.hoverProps).toHaveProperty('onMouseEnter');
      expect(result.current.hoverProps).toHaveProperty('onMouseLeave');
    });

    it('updates hover state on mouse enter', () => {
      const { result } = renderHook(() => useHoverAnimation());
      act(() => {
        result.current.hoverProps.onMouseEnter();
      });
      expect(result.current.isHovered).toBe(true);
    });

    it('updates hover state on mouse leave', () => {
      const { result } = renderHook(() => useHoverAnimation());
      act(() => {
        result.current.hoverProps.onMouseEnter();
        result.current.hoverProps.onMouseLeave();
      });
      expect(result.current.isHovered).toBe(false);
    });
  });

  describe('useFadeInClass', () => {
    it('returns opacity-0 when not visible', () => {
      const { result } = renderHook(() => useFadeInClass(false));
      expect(result.current).toBe('opacity-0');
    });

    it('returns fade-in class when visible', () => {
      const { result } = renderHook(() => useFadeInClass(true));
      expect(result.current).toContain('animate-fade-in');
    });

    it('supports directional fade-in', () => {
      const { result: resultUp } = renderHook(() => useFadeInClass(true, 'up'));
      const { result: resultDown } = renderHook(() =>
        useFadeInClass(true, 'down')
      );
      const { result: resultLeft } = renderHook(() =>
        useFadeInClass(true, 'left')
      );
      const { result: resultRight } = renderHook(() =>
        useFadeInClass(true, 'right')
      );

      expect(resultUp.current).toContain('animate-fade-in-up');
      expect(resultDown.current).toContain('animate-fade-in-down');
      expect(resultLeft.current).toContain('animate-fade-in-left');
      expect(resultRight.current).toContain('animate-fade-in-right');
    });

    it('uses default direction when not specified', () => {
      const { result } = renderHook(() => useFadeInClass(true));
      expect(result.current).toBe('animate-fade-in');
    });
  });
});

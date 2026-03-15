/**
 * useAnimation Hook
 *
 * Custom hook for managing animations with Intersection Observer
 * and scroll-based triggers
 */

import { useEffect, useRef, useState, RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';

interface UseAnimationOptions {
  /**
   * Trigger animation when element enters viewport
   */
  triggerOnce?: boolean;
  /**
   * Threshold for intersection observer (0-1)
   */
  threshold?: number;
  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;
  /**
   * Delay before animation starts (ms)
   */
  delay?: number;
  /**
   * Enable animation (useful for conditional animations)
   */
  enabled?: boolean;
}

/**
 * Hook to trigger animations when element enters viewport
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseAnimationOptions = {}
): [RefObject<T>, boolean] {
  const {
    triggerOnce = true,
    threshold = 0.1,
    rootMargin = '0px',
    delay = 0,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || shouldReduceMotion) {
      setIsInView(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    // If already been in view and triggerOnce is true, skip observer
    if (triggerOnce && hasBeenInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => {
                setIsInView(true);
                setHasBeenInView(true);
              }, delay);
            } else {
              setIsInView(true);
              setHasBeenInView(true);
            }

            // Unobserve if triggerOnce
            if (triggerOnce) {
              observer.unobserve(element);
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, triggerOnce, threshold, rootMargin, delay, hasBeenInView, shouldReduceMotion]);

  return [ref, isInView];
}

/**
 * Hook to get scroll progress (0-1) for an element
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(): [
  RefObject<T>,
  number
] {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress based on element position
      const start = windowHeight;
      const end = -rect.height;
      const range = start - end;
      const currentPos = rect.top;

      const scrollProgress = Math.max(0, Math.min(1, (start - currentPos) / range));
      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return [ref, progress];
}

/**
 * Hook to get stagger delay for list items
 */
export function useStaggerDelay(index: number, baseDelay = 50): number {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion ? 0 : index * baseDelay;
}

/**
 * Hook to check if user prefers reduced motion
 */
export function usePreferReducedMotion(): boolean {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion ?? false;
}

/**
 * Hook to manage animation state
 */
export function useAnimationState(initialState = false) {
  const [isAnimating, setIsAnimating] = useState(initialState);
  const [hasAnimated, setHasAnimated] = useState(false);

  const startAnimation = () => {
    setIsAnimating(true);
    setHasAnimated(true);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
  };

  const resetAnimation = () => {
    setIsAnimating(false);
    setHasAnimated(false);
  };

  return {
    isAnimating,
    hasAnimated,
    startAnimation,
    stopAnimation,
    resetAnimation,
  };
}

/**
 * Hook to apply sequential animations to a list
 */
export function useStaggerAnimation<T extends HTMLElement = HTMLDivElement>(
  count: number,
  options: {
    baseDelay?: number;
    triggerOnce?: boolean;
  } = {}
): [RefObject<T>, boolean[]] {
  const { baseDelay = 100, triggerOnce = true } = options;
  const [ref, isInView] = useInView<T>({ triggerOnce });
  const [itemsInView, setItemsInView] = useState<boolean[]>(
    new Array(count).fill(false)
  );
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;

    if (shouldReduceMotion) {
      // Show all items immediately if reduced motion is preferred
      setItemsInView(new Array(count).fill(true));
      return;
    }

    // Stagger the appearance of items
    const timeouts: NodeJS.Timeout[] = [];

    for (let i = 0; i < count; i++) {
      const timeout = setTimeout(() => {
        setItemsInView((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * baseDelay);

      timeouts.push(timeout);
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isInView, count, baseDelay, shouldReduceMotion]);

  return [ref, itemsInView];
}

/**
 * Hook to manage hover animations
 */
export function useHoverAnimation() {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  return {
    isHovered,
    hoverProps,
  };
}

/**
 * Hook to create fade-in animation classes
 */
export function useFadeInClass(isVisible: boolean, direction?: 'up' | 'down' | 'left' | 'right'): string {
  if (!isVisible) return 'opacity-0';

  const directionClass = direction ? `animate-fade-in-${direction}` : 'animate-fade-in';
  return directionClass;
}

import {describe, expect, it} from 'vitest';
import {render} from '@/lib/test-utils';
import {GoogleGLogo} from './GoogleGLogo';

describe('GoogleGLogo', () => {
  describe('rendering', () => {
    it('renders an SVG element', () => {
      const {container} = render(<GoogleGLogo />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders the four canonical Google brand paths', () => {
      const {container} = render(<GoogleGLogo />);
      const paths = container.querySelectorAll('svg > path');
      expect(paths.length).toBe(4);
    });

    it('applies the default h-5 w-5 size classes', () => {
      const {container} = render(<GoogleGLogo />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('class')).toContain('h-5');
      expect(svg.getAttribute('class')).toContain('w-5');
    });

    it('merges a custom className while preserving defaults', () => {
      const {container} = render(<GoogleGLogo className="custom-class" />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('class')).toContain('custom-class');
    });
  });

  describe('accessibility', () => {
    it('sets aria-hidden="true" so the logo is ignored by screen readers', () => {
      const {container} = render(<GoogleGLogo />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });

    it('is focusable="false" to avoid tab-stops on the decorative icon', () => {
      const {container} = render(<GoogleGLogo />);
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('focusable')).toBe('false');
    });
  });
});

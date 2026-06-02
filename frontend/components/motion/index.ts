/**
 * Motion primitives barrel (Studio Slate v2).
 *
 * Reusable, reduced-motion-aware React components consumed by every surface:
 *   - Reveal        fade + 8px rise on mount or in-view
 *   - Stagger       orchestrates staggered child entrance
 *   - StaggerItem   a single child of Stagger
 *   - PageTransition route-level fade + rise wrapper
 *
 * Variants + helpers live in `@/lib/animation`; CSS tokens in app/globals.css.
 */
export {Reveal} from './Reveal';
export {Stagger} from './Stagger';
export {StaggerItem} from './StaggerItem';
export {PageTransition} from './PageTransition';

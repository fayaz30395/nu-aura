# Animation Guide - NU-AURA

Complete guide to using animations and transitions in the NU-AURA platform.

## Table of Contents

- [Tailwind CSS Animations](#tailwind-css-animations)
- [Framer Motion Variants](#framer-motion-variants)
- [Custom Hooks](#custom-hooks)
- [Components](#components)
- [Best Practices](#best-practices)

## Tailwind CSS Animations

### Basic Animations

Use these classes directly in your JSX:

```tsx
// Fade animations
<div className="animate-fade-in">Fades in</div>
<div className="animate-fade-in-up">Fades in from bottom</div>
<div className="animate-fade-in-down">Fades in from top</div>
<div className="animate-fade-in-left">Fades in from left</div>
<div className="animate-fade-in-right">Fades in from right</div>

// Slide animations
<div className="animate-slide-in-up">Slides in from bottom</div>
<div className="animate-slide-in-down">Slides in from top</div>
<div className="animate-slide-in-left">Slides in from left</div>
<div className="animate-slide-in-right">Slides in from right</div>

// Scale animations
<div className="animate-scale-in">Scales in</div>
<div className="animate-scale-in-center">Scales in from center</div>

// Bounce animations
<div className="animate-bounce-in">Bounces in</div>
<div className="animate-bounce-subtle">Subtle bounce</div>

// Utility animations
<div className="animate-shimmer">Loading shimmer</div>
<div className="animate-pulse-glow">Pulsing glow effect</div>
<div className="animate-float">Floating animation</div>
<div className="animate-wiggle">Wiggle on hover</div>
<div className="animate-shake">Shake effect</div>
```

### Transition Utilities

```tsx
// Standard transitions
<button className="app-transition">Smooth transition</button>
<button className="app-transition-fast">Fast transition</button>
<button className="app-transition-slow">Slow transition</button>
<button className="transition-snappy">Snappy transition</button>

// Hover effects
<div className="hover-lift">Lifts on hover</div>
<div className="hover-glow">Glows on hover</div>

// Interactive states
<button className="active-scale">Scales on press</button>
<button className="active-bounce">Bounces on press</button>
```

### Glass Morphism

```tsx
<div className="glass">Glass effect</div>
<div className="glass-dark">Dark glass effect</div>
<div className="glass-strong">Strong glass effect</div>
```

### Gradients

```tsx
<div className="gradient-primary">Primary gradient</div>
<div className="gradient-secondary">Secondary gradient</div>
<div className="gradient-success">Success gradient</div>
<div className="gradient-mesh">Mesh gradient background</div>
```

### Shadow Glow

```tsx
<div className="shadow-glow-primary">Primary glow</div>
<div className="shadow-glow-success">Success glow</div>
<div className="shadow-glow-error">Error glow</div>
```

### Stagger Animations

```tsx
// Parent container
<div className="stagger-fade-in">
  <div>Item 1 (0.05s delay)</div>
  <div>Item 2 (0.1s delay)</div>
  <div>Item 3 (0.15s delay)</div>
</div>
```

### Loading States

```tsx
<div className="loading-shimmer">
  Loading...
</div>
```

### Card Variants

```tsx
<div className="card">Basic card</div>
<div className="card-hover">Card with hover effect</div>
<div className="card-interactive">Interactive card (clickable)</div>
<div className="card-glass">Glass morphism card</div>
```

### Button Variants

All buttons now include smooth animations:

```tsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-success">Success</button>
<button className="btn btn-danger">Danger</button>
<button className="btn btn-outline-primary">Outline</button>
<button className="btn btn-ghost">Ghost</button>
```

## Framer Motion Variants

Import from `@/lib/utils/animations`:

### Basic Variants

```tsx
import { fadeInVariants, fadeInUpVariants, scaleInVariants } from '@/lib/utils/animations';
import { motion } from 'framer-motion';

<motion.div
  initial="hidden"
  animate="visible"
  variants={fadeInVariants}
>
  Content
</motion.div>
```

Available variants:
- `fadeInVariants` - Simple fade in
- `fadeInUpVariants` - Fade in from bottom
- `fadeInDownVariants` - Fade in from top
- `fadeInLeftVariants` - Fade in from left
- `fadeInRightVariants` - Fade in from right
- `scaleInVariants` - Scale in
- `modalVariants` - Modal/dialog animation with exit
- `backdropVariants` - Backdrop animation
- `slideUpVariants` - Slide up (for mobile sheets)
- `cardHoverVariants` - Card hover effect
- `buttonPressVariants` - Button press effect
- `pageTransitionVariants` - Page transition with exit

### Stagger Animations

```tsx
import { staggerContainerVariants, staggerItemVariants } from '@/lib/utils/animations';

<motion.div
  initial="hidden"
  animate="visible"
  variants={staggerContainerVariants}
>
  <motion.div variants={staggerItemVariants}>Item 1</motion.div>
  <motion.div variants={staggerItemVariants}>Item 2</motion.div>
  <motion.div variants={staggerItemVariants}>Item 3</motion.div>
</motion.div>
```

### Custom Variants

```tsx
import { createFadeVariants, createScaleVariants } from '@/lib/utils/animations';

// Custom fade with options
const customFade = createFadeVariants('up', 30, 0.5);

<motion.div variants={customFade}>
  Content
</motion.div>

// Custom scale
const customScale = createScaleVariants(0.8, 0.4);

<motion.div variants={customScale}>
  Content
</motion.div>
```

### Easing & Duration

```tsx
import { EASING, DURATION, SPRING } from '@/lib/utils/animations';

<motion.div
  animate={{ opacity: 1 }}
  transition={{
    duration: DURATION.normal,
    ease: EASING.smooth,
  }}
>
  Content
</motion.div>

// With spring
<motion.div
  animate={{ scale: 1 }}
  transition={SPRING.bouncy}
>
  Content
</motion.div>
```

Available presets:
- **EASING**: `smooth`, `snappy`, `bounce`, `ease`, `easeIn`, `easeOut`, `easeInOut`
- **DURATION**: `instant`, `fast`, `normal`, `slow`, `slower`
- **SPRING**: `gentle`, `bouncy`, `stiff`, `smooth`

## Custom Hooks

### useInView

Trigger animations when element enters viewport:

```tsx
import { useInView } from '@/lib/hooks/useAnimation';

function Component() {
  const [ref, isInView] = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <div ref={ref} className={isInView ? 'animate-fade-in-up' : 'opacity-0'}>
      Animates when visible
    </div>
  );
}
```

Options:
- `triggerOnce` - Only animate once (default: true)
- `threshold` - Intersection threshold 0-1 (default: 0.1)
- `rootMargin` - Root margin (default: '0px')
- `delay` - Delay before animation (ms)
- `enabled` - Enable/disable animation

### useScrollProgress

Track scroll progress for parallax effects:

```tsx
import { useScrollProgress } from '@/lib/hooks/useAnimation';

function Component() {
  const [ref, progress] = useScrollProgress();

  return (
    <div ref={ref} style={{ opacity: progress }}>
      Fades based on scroll
    </div>
  );
}
```

### useStaggerAnimation

Sequential animations for lists:

```tsx
import { useStaggerAnimation } from '@/lib/hooks/useAnimation';

function Component() {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  const [ref, itemsInView] = useStaggerAnimation(items.length, { baseDelay: 100 });

  return (
    <div ref={ref}>
      {items.map((item, i) => (
        <div
          key={i}
          className={itemsInView[i] ? 'animate-fade-in-up' : 'opacity-0'}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
```

### useHoverAnimation

Manage hover state for animations:

```tsx
import { useHoverAnimation } from '@/lib/hooks/useAnimation';

function Component() {
  const { isHovered, hoverProps } = useHoverAnimation();

  return (
    <div {...hoverProps} className={isHovered ? 'scale-105' : 'scale-100'}>
      Hover me
    </div>
  );
}
```

## Components

### AnimatedCard

Pre-built card with animations:

```tsx
import { AnimatedCard } from '@/components/ui/AnimatedCard';

<AnimatedCard variant="hover" animationType="fadeInUp" delay={0.1}>
  <h3>Card Title</h3>
  <p>Card content</p>
</AnimatedCard>
```

Props:
- `variant`: 'default' | 'hover' | 'glass' | 'interactive'
- `animationType`: 'fadeInUp' | 'scaleIn' | 'none'
- `delay`: number (seconds)

### AnimatedList & AnimatedListItem

Stagger animation for lists:

```tsx
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedCard';

<AnimatedList staggerDelay={0.1}>
  <AnimatedListItem>Item 1</AnimatedListItem>
  <AnimatedListItem>Item 2</AnimatedListItem>
  <AnimatedListItem>Item 3</AnimatedListItem>
</AnimatedList>
```

## Best Practices

### 1. Respect Reduced Motion

All hooks automatically respect `prefers-reduced-motion`. Animations are disabled for users who prefer reduced motion.

### 2. Performance

- Use CSS animations for simple effects (fade, slide)
- Use Framer Motion for complex orchestrations
- Avoid animating width/height (use scale instead)
- Use `transform` and `opacity` for best performance

### 3. Timing

- **Fast**: 150-200ms for immediate feedback (buttons, hovers)
- **Normal**: 300-400ms for standard transitions
- **Slow**: 500-700ms for emphasis (modals, page transitions)

### 4. Easing

- **Snappy** (`[0.16, 1, 0.3, 1]`): UI elements, cards
- **Smooth** (`[0.4, 0, 0.2, 1]`): Page transitions, large movements
- **Bounce** (`[0.68, -0.55, 0.27, 1.55]`): Playful interactions

### 5. Stagger

For lists, stagger delays of 50-100ms work best:

```tsx
// Good
<AnimatedList staggerDelay={0.1}>
  {items.map(...)}
</AnimatedList>

// Too slow
<AnimatedList staggerDelay={0.5}>
  {items.map(...)}
</AnimatedList>
```

### 6. Accessibility

- Never rely solely on animation to convey information
- Provide alternative indicators for loading states
- Ensure animations don't cause motion sickness

### 7. Consistency

Maintain consistent animation patterns across the app:
- Cards: `fadeInUp` with `hover-lift`
- Modals: `modalVariants` with backdrop
- Lists: `staggerContainerVariants`
- Buttons: `active-scale` with `hover-lift`

## Examples

### Page Layout

```tsx
import { motion } from 'framer-motion';
import { pageTransitionVariants } from '@/lib/utils/animations';

export default function Page() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageTransitionVariants}
    >
      <h1 className="animate-fade-in-up">Page Title</h1>
      <div className="stagger-fade-in">
        <div>Content 1</div>
        <div>Content 2</div>
        <div>Content 3</div>
      </div>
    </motion.div>
  );
}
```

### Interactive Card Grid

```tsx
import { AnimatedCard } from '@/components/ui/AnimatedCard';

export function CardGrid() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <AnimatedCard
          key={card.id}
          variant="interactive"
          animationType="fadeInUp"
          delay={i * 0.1}
        >
          <h3>{card.title}</h3>
          <p>{card.description}</p>
        </AnimatedCard>
      ))}
    </div>
  );
}
```

### Modal with Backdrop

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, backdropVariants } from '@/lib/utils/animations';

export function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            className="modal-content"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Scroll-triggered Animation

```tsx
import { useInView } from '@/lib/hooks/useAnimation';

export function ScrollSection() {
  const [ref, isInView] = useInView({ threshold: 0.3 });

  return (
    <section
      ref={ref}
      className={isInView ? 'animate-fade-in-up' : 'opacity-0'}
    >
      <h2>Appears on scroll</h2>
    </section>
  );
}
```

## Additional Resources

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Web Animation Performance](https://web.dev/animations/)

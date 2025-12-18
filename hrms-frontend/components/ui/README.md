# HRMS Platform - Modern UI Component Library

A comprehensive, production-ready collection of reusable UI components for the HRMS platform. Built with React 18, TypeScript, Tailwind CSS, and Framer Motion for smooth animations.

## Overview

This component library provides 6 foundational components that can be composed and extended to build sophisticated user interfaces for the HRMS system.

### Components

1. **Button** - Versatile button with 7 variants and 3 sizes
2. **Card** - Composable container with header, content, footer
3. **Input** - Form input with validation, icons, and error states
4. **Badge** - Status badges with 7 color variants
5. **StatCard** - Metric display cards with trends
6. **Sidebar** - Collapsible navigation with nested items

## Files Overview

```
components/ui/
├── Button.tsx                 # Button component (79 lines)
├── Card.tsx                   # Card component with sub-components (104 lines)
├── Input.tsx                  # Form input component (173 lines)
├── Badge.tsx                  # Status badge component (79 lines)
├── StatCard.tsx               # Statistics display card (149 lines)
├── Sidebar.tsx                # Navigation sidebar (212 lines)
├── index.ts                   # Barrel export file
├── types.ts                   # TypeScript type definitions
├── COMPONENT_GUIDE.md         # Comprehensive component documentation
├── QUICK_START.md             # Quick start guide with examples
└── README.md                  # This file
```

**Total Lines of Code:** 796 lines
**Total Size:** ~52 KB

## Features

### Design & UX
- Modern, clean design system
- Full dark mode support
- Smooth Framer Motion animations
- Responsive design (mobile-first)
- Accessibility-first approach
- Consistent spacing and typography

### Developer Experience
- Full TypeScript support
- Barrel exports for clean imports
- forwardRef support for DOM access
- Composition-based architecture
- Extensive prop documentation
- Type-safe variant systems

### Performance
- Optimized with memoization
- Lazy animations on demand
- Minimal bundle impact
- Efficient re-renders
- Production-ready

## Quick Installation

No additional installation needed! All dependencies are already in `package.json`:
- react@18.2.0
- typescript@5.3.3
- tailwindcss@3.4.0
- framer-motion@12.23.24
- class-variance-authority@0.7.1
- lucide-react@0.300.0

## Usage Examples

### Basic Button
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

### Form with Input and Card
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter, Input, Button } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <Input label="Email" type="email" placeholder="user@example.com" />
    <Input label="Name" placeholder="Full Name" />
  </CardContent>
  <CardFooter>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>
```

### Dashboard with Stats
```tsx
import { StatCard } from '@/components/ui';
import { Users } from 'lucide-react';

<div className="grid grid-cols-4 gap-6">
  <StatCard
    icon={<Users className="h-6 w-6" />}
    title="Total Employees"
    value={856}
    trend={{ value: 12, isPositive: true, label: "vs last month" }}
  />
</div>
```

### Navigation Sidebar
```tsx
import { Sidebar } from '@/components/ui';
import { Home, Users, Settings } from 'lucide-react';

const items = [
  { id: 'home', label: 'Dashboard', icon: <Home /> },
  { id: 'users', label: 'Employees', icon: <Users />, badge: 5 },
  { id: 'settings', label: 'Settings', icon: <Settings /> }
];

<Sidebar items={items} activeId="home" onItemClick={handleNavigation} />
```

## Component API Reference

### Button
```tsx
<Button
  variant="primary"              // default | primary | secondary | outline | ghost | destructive | link
  size="md"                      // sm | md | lg
  isLoading={false}              // Show loading spinner
  loadingText="Saving..."        // Text during loading
  disabled={false}               // Disable button
  onClick={handler}
  className="custom-styles"
>
  Button Text
</Button>
```

### Card
```tsx
<Card isClickable={false} hoverEffect={true} onClick={handler}>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>
```

### Input
```tsx
<Input
  label="Email"                  // Label text
  type="email"                   // Input type
  placeholder="user@example.com"
  icon={<Mail />}                // Left icon
  rightIcon={<Search />}         // Right icon (custom or auto for password)
  error="Email is invalid"       // Error message
  success={false}                // Success state
  helper="Additional info"       // Helper text
  variant="default"              // default | filled
  disabled={false}
  onChange={handler}
/>
```

### Badge
```tsx
<Badge
  variant="success"              // default | primary | secondary | success | warning | destructive | outline
  size="md"                      // sm | md | lg
  icon={<Check />}               // Optional icon
  animated={false}               // Entrance animation
  className="custom-styles"
>
  Badge Text
</Badge>
```

### StatCard
```tsx
<StatCard
  icon={<Users />}               // Display icon
  title="Total Employees"        // Metric title
  value={856}                    // Metric value
  description="Last 30 days"     // Optional description
  trend={{                       // Optional trend indicator
    value: 12,                   // Percentage change
    isPositive: true,            // Direction
    label: "vs last month"       // Trend label
  }}
  variant="default"              // default | primary | success | warning | destructive
  animated={true}                // Entrance animation
/>
```

### Sidebar
```tsx
<Sidebar
  items={[                       // Navigation items
    {
      id: 'home',
      label: 'Dashboard',
      icon: <Home />,
      href: '/dashboard',
      badge: 5,                  // Optional notification badge
      disabled: false,
      children: []               // Optional submenu items
    }
  ]}
  activeId="home"                // Currently active item
  collapsed={false}              // Collapse state
  onCollapsedChange={handler}    // Collapse toggle handler
  collapsible={true}             // Allow collapsing
  variant="default"              // default | compact | minimal
  onItemClick={handler}          // Item click handler
/>
```

## Documentation

- **QUICK_START.md** - Get started in 5 minutes with examples
- **COMPONENT_GUIDE.md** - Detailed documentation for each component
- **types.ts** - TypeScript type definitions

## Styling

All components use **Tailwind CSS** with full dark mode support.

### Custom Styling
```tsx
import { Button } from '@/components/ui';

<Button className="rounded-full px-8">Custom Button</Button>
```

### Dark Mode
Enable in `tailwind.config.js`:
```js
module.exports = {
  darkMode: 'class',
  // ...
}
```

## Animation Library

Components use **Framer Motion** for smooth animations:
- Spring physics for natural motion
- Optimized for 60fps
- Can be disabled via props for performance

## Accessibility

All components follow WCAG 2.1 guidelines:
- Semantic HTML
- ARIA labels and attributes
- Keyboard navigation
- Focus management
- Color contrast compliance
- Screen reader support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Performance Metrics

- **Initial bundle size:** ~50KB (all components)
- **Tree-shakeable:** Yes, use barrel imports
- **Performance cost:** Minimal with memoization
- **Animation performance:** 60fps on modern devices

## Best Practices

1. **Use Composition** - Build complex UIs from simple components
2. **Type Safety** - Import and use TypeScript interfaces
3. **Variant System** - Use variants for consistent styling
4. **forwardRef** - All components support ref forwarding
5. **Dark Mode** - Components automatically support dark mode
6. **Responsive** - Use Tailwind's breakpoints for responsive design

## Component Composition Example

```tsx
'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Input,
  Badge,
  StatCard
} from '@/components/ui';

export function EmployeeManagement() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard title="Total" value={856} variant="primary" />
        <StatCard title="Active" value={742} variant="success" />
        <StatCard title="Inactive" value={114} variant="warning" />
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Employee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Enter full name"
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="employee@company.com"
            required
          />
          <div className="flex gap-2">
            <Badge variant="primary">Permanent</Badge>
            <Badge variant="success">Verified</Badge>
          </div>
        </CardContent>
        <CardFooter className="gap-4">
          <Button variant="outline">Cancel</Button>
          <Button
            variant="primary"
            isLoading={isLoading}
            loadingText="Adding..."
            onClick={() => setIsLoading(true)}
          >
            Add Employee
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

## Extending Components

Components are designed to be extended. Example:

```tsx
import { Button, type ButtonProps } from '@/components/ui';

export function IconButton(props: ButtonProps & { icon: React.ReactNode }) {
  return (
    <Button {...props}>
      {props.icon}
      {props.children}
    </Button>
  );
}
```

## Performance Optimization

For large lists or complex UIs:

```tsx
import { useMemo } from 'react';

// Memoize expensive computations
const items = useMemo(() => largeList.map(...), [largeList]);

// Disable animations on low-end devices
<StatCard animated={prefersReducedMotion} {...props} />
```

## Common Patterns

### Loading State
```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await submit();
  } finally {
    setIsLoading(false);
  }
};

<Button isLoading={isLoading} onClick={handleSubmit}>Submit</Button>
```

### Form Validation
```tsx
const [error, setError] = useState('');

const validate = (value: string) => {
  if (!value) {
    setError('Required');
    return false;
  }
  setError('');
  return true;
};

<Input error={error} onChange={(e) => validate(e.target.value)} />
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard {...props} />
  <StatCard {...props} />
  <StatCard {...props} />
  <StatCard {...props} />
</div>
```

## Troubleshooting

### Styles not applying
1. Check `tailwind.config.js` includes all necessary paths
2. Restart dev server
3. Clear `.next` cache

### Animations stuttering
1. Check browser hardware acceleration is enabled
2. Reduce number of simultaneous animations
3. Use `animated={false}` on StatCard

### TypeScript errors
1. Update TypeScript: `npm update typescript`
2. Run `npm run build` to check for errors
3. Check component imports are correct

## Future Components

Planned additions:
- Modal/Dialog
- Select/Combobox
- Tabs
- Pagination
- Table
- Toast
- Avatar
- Tooltip
- Checkbox
- Radio
- Switch

## Contributing

To add new components:

1. Create component file in `/components/ui/`
2. Add TypeScript interfaces
3. Export from `index.ts`
4. Add types to `types.ts`
5. Document in `COMPONENT_GUIDE.md`
6. Test with Tailwind and dark mode

## License

Part of the HRMS Platform project.

## Support

For questions or issues:
1. Check `COMPONENT_GUIDE.md` for detailed docs
2. Review `QUICK_START.md` for examples
3. Check component source files for advanced usage
4. Review TypeScript interfaces in source files

---

Built with modern React patterns and best practices for the HRMS platform. Ready for production use.

**Version:** 1.0.0
**Last Updated:** November 24, 2024

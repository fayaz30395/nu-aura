# UI Components Guide

A comprehensive set of modern, reusable UI components for the HRMS platform built with React, TypeScript, Tailwind CSS, and Framer Motion.

## Components Overview

### 1. Button Component

**File:** `/components/ui/Button.tsx`

Versatile button component with multiple variants, sizes, and loading states.

#### Features:
- 7 variants: default, primary, secondary, outline, ghost, destructive, link
- 3 sizes: sm, md, lg
- Loading state with spinner animation
- Fully typed with TypeScript
- Accessible with proper ARIA attributes

#### Usage Examples:

```tsx
import { Button } from '@/components/ui';

// Basic button
<Button>Click me</Button>

// With variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline Style</Button>
<Button variant="ghost">Ghost Style</Button>
<Button variant="link">Link Style</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// Loading state
<Button isLoading={true} loadingText="Saving...">Save</Button>

// Combined
<Button variant="primary" size="lg" isLoading={isSubmitting}>
  Submit Form
</Button>
```

---

### 2. Card Component

**File:** `/components/ui/Card.tsx`

Flexible card container with header, content, and footer sections. Supports animations and hover effects.

#### Features:
- Composable structure (Header, Title, Description, Content, Footer)
- Smooth hover animations with framer-motion
- Dark mode support
- Multiple sub-components for flexibility

#### Usage Examples:

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui';

// Basic card
<Card>
  <CardContent>
    Simple card content here
  </CardContent>
</Card>

// Full featured card
<Card>
  <CardHeader>
    <CardTitle>Employee Details</CardTitle>
    <CardDescription>View and edit employee information</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Employee information goes here</p>
  </CardContent>
  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>

// Clickable card
<Card isClickable={true} hoverEffect={true} onClick={handleCardClick}>
  <CardContent>
    Click to navigate
  </CardContent>
</Card>
```

---

### 3. Input Component

**File:** `/components/ui/Input.tsx`

Form input with label, error states, icons, and password toggle functionality.

#### Features:
- Built-in label and error messaging
- Success state with icon
- Left and right icon support
- Password field with show/hide toggle
- Error and helper text with animations
- Filled and default variants
- Focus states with ring animations

#### Usage Examples:

```tsx
import { Input } from '@/components/ui';

// Basic input
<Input placeholder="Enter name" />

// With label
<Input label="Email Address" type="email" placeholder="john@example.com" />

// With error
<Input
  label="Username"
  error="Username is already taken"
  placeholder="Choose username"
/>

// With success state
<Input
  label="Email"
  value="valid@email.com"
  success={true}
  helper="Email verified"
/>

// With icons
import { Mail, Lock } from 'lucide-react';

<Input
  label="Email"
  type="email"
  icon={<Mail className="h-4 w-4" />}
  placeholder="Enter email"
/>

// Password field (auto-includes show/hide toggle)
<Input
  label="Password"
  type="password"
  placeholder="Enter password"
/>

// Custom variant
<Input
  variant="filled"
  label="Search"
  placeholder="Search employees..."
/>
```

---

### 4. Badge Component

**File:** `/components/ui/Badge.tsx`

Status badges with color variants and optional icons.

#### Features:
- 7 color variants: default, primary, secondary, success, warning, destructive, outline
- 3 sizes: sm, md, lg
- Optional icon support
- Smooth animations
- Lightweight and performant

#### Usage Examples:

```tsx
import { Badge } from '@/components/ui';
import { Check, AlertCircle } from 'lucide-react';

// Basic badge
<Badge>Active</Badge>

// With variants
<Badge variant="primary">In Progress</Badge>
<Badge variant="success">Approved</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Rejected</Badge>
<Badge variant="outline">Draft</Badge>

// With icons
<Badge variant="success" icon={<Check className="h-3 w-3" />}>
  Verified
</Badge>

<Badge variant="warning" icon={<AlertCircle className="h-3 w-3" />}>
  Warning
</Badge>

// Different sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>

// With animation
<Badge animated={true} variant="primary">New</Badge>
```

---

### 5. StatCard Component

**File:** `/components/ui/StatCard.tsx`

Statistics display card showing metrics with icons, trends, and descriptions.

#### Features:
- Icon and title support
- Large value display
- Trend indicator (positive/negative with percentage)
- Multiple color variants
- Smooth entrance animations
- Description text support

#### Usage Examples:

```tsx
import { StatCard } from '@/components/ui';
import { Users, TrendingUp } from 'lucide-react';

// Basic stat card
<StatCard
  title="Total Employees"
  value={1234}
/>

// With icon and trend
<StatCard
  icon={<Users className="h-6 w-6" />}
  title="Active Employees"
  value={856}
  description="Last 30 days"
  trend={{
    value: 12,
    isPositive: true,
    label: "vs last month"
  }}
/>

// Different variants
<StatCard
  variant="primary"
  title="Pending Approvals"
  value={23}
/>

<StatCard
  variant="success"
  title="Completed Tasks"
  value={456}
  trend={{
    value: 8,
    isPositive: true
  }}
/>

<StatCard
  variant="warning"
  title="Under Review"
  value={12}
  trend={{
    value: 5,
    isPositive: false
  }}
/>

<StatCard
  variant="destructive"
  title="Failed Operations"
  value={3}
/>

// Without animation
<StatCard
  title="Metrics"
  value={100}
  animated={false}
/>
```

---

### 6. Sidebar Component

**File:** `/components/ui/Sidebar.tsx`

Collapsible sidebar navigation with icons, badges, and submenu support.

#### Features:
- Collapsible/expandable sidebar
- Nested submenu items
- Active state highlighting
- Badge support for notifications
- Multiple variants: default, compact, minimal
- Smooth animations and transitions
- Disabled items support
- Customizable item click handlers

#### Usage Examples:

```tsx
import { Sidebar } from '@/components/ui';
import {
  Home,
  Users,
  Settings,
  LogOut,
  FileText,
  Clock
} from 'lucide-react';

// Define sidebar items
const sidebarItems = [
  {
    id: 'home',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    href: '/dashboard'
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: <Users className="h-5 w-5" />,
    href: '/employees',
    badge: 5, // Shows notification badge
    children: [
      {
        id: 'employees-list',
        label: 'All Employees',
        icon: <FileText className="h-4 w-4" />,
        href: '/employees/list'
      },
      {
        id: 'employees-attendance',
        label: 'Attendance',
        icon: <Clock className="h-4 w-4" />,
        href: '/employees/attendance'
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings'
  },
  {
    id: 'logout',
    label: 'Logout',
    icon: <LogOut className="h-5 w-5" />,
    onClick: handleLogout
  }
];

// Basic sidebar
<Sidebar
  items={sidebarItems}
  activeId="home"
  onItemClick={(item) => {
    if (item.href) {
      router.push(item.href);
    }
  }}
/>

// Controlled sidebar state
const [isCollapsed, setIsCollapsed] = useState(false);

<Sidebar
  items={sidebarItems}
  activeId={currentActiveId}
  collapsed={isCollapsed}
  onCollapsedChange={setIsCollapsed}
  collapsible={true}
  variant="default"
  onItemClick={(item) => handleItemClick(item)}
/>

// Compact variant
<Sidebar
  items={sidebarItems}
  variant="compact"
  collapsible={false}
/>

// Minimal variant
<Sidebar
  items={sidebarItems}
  variant="minimal"
/>
```

---

## Styling and Customization

All components use **Tailwind CSS** for styling and support the `className` prop for custom styles.

```tsx
import { Button, Card, Input } from '@/components/ui';

// Custom styling
<Button className="rounded-full py-6">Custom Styled Button</Button>

<Card className="border-2 border-blue-500 shadow-lg">
  <CardContent>Custom Card</CardContent>
</Card>

<Input
  className="border-2 border-green-500"
  placeholder="Custom Input"
/>
```

## Dark Mode Support

All components fully support Tailwind's dark mode with the `dark:` prefix utilities.

## Animations

Components use **Framer Motion** for smooth, performant animations:
- Card hover effects
- Badge entrance animations
- StatCard slide-up animations
- Sidebar collapse animations
- Input error message animations
- Sidebar submenu expand/collapse animations

## Type Safety

All components are fully typed with TypeScript and export their respective prop interfaces:

```tsx
import { Button, type ButtonProps } from '@/components/ui';
import { Input, type InputProps } from '@/components/ui';
import { Badge, type BadgeProps } from '@/components/ui';
```

## Accessibility

All components follow accessibility best practices:
- Proper ARIA labels and attributes
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Semantic HTML

## Dependencies

The UI components rely on:
- **React 18.2+**
- **TypeScript 5.3+**
- **Tailwind CSS 3.4+**
- **Framer Motion 12.23+**
- **class-variance-authority 0.7+**
- **clsx 2.0+**
- **tailwind-merge 2.2+**
- **lucide-react 0.300+** (for icons)

## Best Practices

1. **Use forwardRef** - Components maintain ref forwarding for DOM access
2. **Class merging** - Use the `cn()` utility to safely merge Tailwind classes
3. **Variants** - Use the variant system for consistent styling
4. **Composition** - Build complex UIs by composing simple components
5. **Performance** - Components are optimized with proper memoization and animations
6. **Testing** - All components are compatible with popular testing libraries

## Import Patterns

### Individual imports
```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
```

### Barrel import
```tsx
import {
  Button,
  Card,
  Input,
  Badge,
  StatCard,
  Sidebar
} from '@/components/ui';
```

## Future Enhancements

Potential components to add:
- Modal/Dialog
- Dropdown Menu
- Select/Combobox
- Toast Notifications
- Progress Bars
- Tabs
- Pagination
- Breadcrumbs
- Avatar
- Tooltip
- Checkbox/Radio
- Switch/Toggle
- Table

---

Created with modern React patterns and best practices for the HRMS platform.

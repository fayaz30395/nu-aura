# Quick Start Guide - UI Components

## Installation
All dependencies are already installed in the project. No additional setup required!

## Import Components

```tsx
// Option 1: Import from barrel export (recommended)
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Badge,
  StatCard,
  Sidebar
} from '@/components/ui';

// Option 2: Import individually
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
```

## 5-Minute Starter Template

```tsx
'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Badge,
  StatCard,
  Sidebar
} from '@/components/ui';
import { Users, TrendingUp, Home, Settings } from 'lucide-react';

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarItems = [
    {
      id: 'home',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="h-5 w-5" />,
      badge: 12
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        items={sidebarItems}
        activeId="home"
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
            Welcome to Dashboard
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage your HRMS with our modern UI components
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-6 w-6" />}
            title="Total Employees"
            value={856}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            variant="primary"
            title="Present Today"
            value={742}
            description="98.5% attendance"
          />
          <StatCard
            variant="success"
            title="Approvals Pending"
            value={24}
          />
          <StatCard
            variant="warning"
            title="Pending Tasks"
            value={15}
            trend={{ value: 5, isPositive: false }}
          />
        </div>

        {/* Card Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Employee</CardTitle>
            <CardDescription>Add a new employee to the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Full Name" placeholder="Enter full name" />
            <Input label="Email" type="email" placeholder="employee@company.com" />
            <div className="flex gap-2">
              <Badge variant="primary">Active</Badge>
              <Badge variant="success">Verified</Badge>
            </div>
          </CardContent>
          <CardFooter className="gap-4">
            <Button variant="outline">Cancel</Button>
            <Button variant="primary">Add Employee</Button>
          </CardFooter>
        </Card>

        {/* Form Example */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Username"
              placeholder="Choose username"
              error="This username is already taken"
            />
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              success={true}
              helper="Email verified successfully"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter secure password"
            />
          </CardContent>
          <CardFooter>
            <Button isLoading={false} variant="primary" size="lg">
              Sign Up
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
```

## Common Patterns

### Button with Loading State
```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await submitForm();
  } finally {
    setIsLoading(false);
  }
};

<Button
  isLoading={isLoading}
  loadingText="Submitting..."
  onClick={handleSubmit}
>
  Submit
</Button>
```

### Form with Validation
```tsx
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');

const validateEmail = (value: string) => {
  if (!value.includes('@')) {
    setEmailError('Invalid email');
    return false;
  }
  setEmailError('');
  return true;
};

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    validateEmail(e.target.value);
  }}
  error={emailError}
/>
```

### Responsive Stat Grid
```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
  <StatCard title="Metric 1" value={100} />
  <StatCard title="Metric 2" value={200} />
  <StatCard title="Metric 3" value={300} />
  <StatCard title="Metric 4" value={400} />
</div>
```

### Navigation with Sidebar
```tsx
const [activeId, setActiveId] = useState('dashboard');

<Sidebar
  items={navigationItems}
  activeId={activeId}
  onItemClick={(item) => {
    setActiveId(item.id);
    if (item.href) router.push(item.href);
  }}
/>
```

## Component Cheat Sheet

| Component | Primary Use | Key Props |
|-----------|------------|-----------|
| **Button** | Call-to-action, form submission | variant, size, isLoading |
| **Card** | Content containers | isClickable, hoverEffect |
| **Input** | Form fields | label, error, icon, type |
| **Badge** | Status indicators | variant, icon, animated |
| **StatCard** | Metrics display | icon, value, trend |
| **Sidebar** | Navigation menu | items, activeId, collapsed |

## Available Variants

### Button Variants
- default, primary, secondary, outline, ghost, destructive, link

### Badge Variants
- default, primary, secondary, success, warning, destructive, outline

### StatCard Variants
- default, primary, success, warning, destructive

## Responsive Design

All components are mobile-first and support Tailwind's responsive breakpoints:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

## Dark Mode

All components automatically support dark mode. Enable in your `tailwind.config.js`:

```js
module.exports = {
  darkMode: 'class', // or 'media'
  // ... rest of config
}
```

## Icon Library

Use icons from `lucide-react`:

```tsx
import { Users, Settings, Home, TrendingUp, AlertCircle } from 'lucide-react';
```

## Performance Tips

1. Memoize components with many props
2. Use `animated={false}` on StatCard if animations cause performance issues
3. Debounce Input onChange handlers for expensive operations
4. Lazy load heavy component lists with Sidebar

## Troubleshooting

### Styles not applying?
- Ensure Tailwind CSS is installed: `npm list tailwindcss`
- Check `tailwind.config.js` includes all necessary paths

### Animations not smooth?
- Verify framer-motion is installed: `npm list framer-motion`
- Check browser hardware acceleration is enabled

### TypeScript errors?
- Run `npm run build` to check for compilation errors
- Ensure TypeScript version is 5.3+

## Next Steps

1. Review `COMPONENT_GUIDE.md` for detailed documentation
2. Check the component source files for advanced usage
3. Create custom components by extending existing ones
4. Use in your pages and forms

---

Happy building! 🚀

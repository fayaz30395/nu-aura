# NU AURA Dark Theme Migration Guide

Complete guide to transform your HRMS application to use the modern, executive-grade dark theme inspired by the CEO Dashboard.

## 🎨 Design Philosophy

The Aura Dark Theme provides:
- **Executive-grade aesthetics**: Professional, modern, sophisticated
- **Deep dark backgrounds**: #0B0F19 base with layered surfaces
- **Vibrant accent colors**: High contrast for better readability
- **Subtle glows**: Depth through strategic use of box-shadows
- **Premium typography**: DM Sans + JetBrains Mono

## 📋 Migration Steps

### Step 1: Backup Current Configuration

```bash
# Create backups
cp frontend/tailwind.config.js frontend/tailwind.config.js.backup
cp frontend/app/layout.tsx frontend/app/layout.tsx.backup
cp frontend/app/globals.css frontend/app/globals.css.backup
```

### Step 2: Replace Tailwind Configuration

```bash
# Replace with Aura Dark config
mv frontend/tailwind.config.js frontend/tailwind.config.light.js
cp frontend/tailwind.config.aura-dark.js frontend/tailwind.config.js
```

**OR** manually update your `tailwind.config.js`:

```javascript
// Add to your existing tailwind.config.js
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class', // Enable dark mode
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono],
      },
      colors: {
        aura: {
          bg: '#0B0F19',
          surface: '#111827',
          card: '#151D2E',
          hover: '#1A2235',
          border: '#1E293B',
        },
        // ... rest of colors from tailwind.config.aura-dark.js
      },
    },
  },
};
```

### Step 3: Update Root Layout

Replace `frontend/app/layout.tsx` content:

```typescript
import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NU Aura - HRMS Platform',
  description: 'Modern Human Resource Management System',
  themeColor: '#0B0F19',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark" // ← Enable dark mode
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                document.documentElement.classList.add('dark');
                localStorage.setItem('darkMode', 'true');
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        style={{
          background: '#0B0F19',
          color: '#F1F5F9',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 4: Update Global CSS

Replace `frontend/app/globals.css` with content from `globals.aura-dark.css`

### Step 5: Update Component Styling

#### Before (Light Theme):
```tsx
// Old styling
<div className="bg-white text-gray-900 border-gray-200">
  <h1 className="text-gray-900">Dashboard</h1>
  <Card className="bg-white shadow-sm">
    <p className="text-gray-600">Content</p>
  </Card>
</div>
```

#### After (Aura Dark Theme):
```tsx
// New Aura dark styling
<div className="bg-aura-bg text-text-primary border-aura-border">
  <h1 className="text-text-primary">Dashboard</h1>
  <Card className="bg-aura-card shadow-card">
    <p className="text-text-secondary">Content</p>
  </Card>
</div>
```

## 🔄 Component Update Examples

### 1. Update Card Component

**File: `frontend/components/ui/Card.tsx`**

```tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'glow';
    hover?: boolean;
  }
>(({ className, variant = 'default', hover = false, ...props }, ref) => {
  const variantStyles = {
    default: 'bg-aura-card border border-aura-border shadow-card',
    elevated: 'bg-aura-card border border-aura-border shadow-elevated',
    glow: 'bg-aura-card border border-aura-border shadow-glow-primary',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl transition-all duration-200',
        variantStyles[variant],
        hover && 'hover:shadow-card-hover hover:border-aura-hover cursor-pointer',
        className
      )}
      {...props}
    />
  );
});

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1 p-5 pb-4', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-tight text-text-primary',
      className
    )}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-5 pt-0', className)}
    {...props}
  />
));

CardContent.displayName = 'CardContent';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
};
```

### 2. Update Button Component

**File: `frontend/components/ui/Button.tsx`**

```tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary: 'bg-gradient-to-b from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-glow-primary',
      secondary: 'bg-aura-hover text-text-primary hover:bg-surface-700 border border-aura-border',
      success: 'bg-gradient-to-b from-success-500 to-success-600 text-white hover:from-success-600 hover:to-success-700 shadow-glow-success',
      danger: 'bg-gradient-to-b from-danger-500 to-danger-600 text-white hover:from-danger-600 hover:to-danger-700 shadow-glow-danger',
      ghost: 'bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary',
      outline: 'bg-transparent border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-aura-bg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

### 3. Update Page Layout Example

**File: `frontend/app/dashboards/employee/page.tsx`**

```tsx
// Before - Light theme colors
<div className="bg-white text-gray-900">
  <h1 className="text-gray-900">Welcome, {user.name}!</h1>
  <div className="grid grid-cols-4 gap-4">
    <Card className="bg-white border-gray-200">
      <div className="bg-blue-50 text-blue-600">
        <CheckCircle className="h-6 w-6" />
      </div>
    </Card>
  </div>
</div>

// After - Aura dark theme
<div className="bg-aura-bg text-text-primary">
  <h1 className="text-text-primary">Welcome, {user.name}!</h1>
  <div className="grid grid-cols-4 gap-4">
    <Card variant="elevated" hover>
      <div className="bg-gradient-success rounded-xl p-4">
        <CheckCircle className="h-6 w-6 text-success-400" />
      </div>
    </Card>
  </div>
</div>
```

### 4. Update Sidebar/Navigation

**File: `frontend/components/layout/Sidebar.tsx`**

```tsx
// Update sidebar styling
<div className="h-screen bg-aura-surface border-r border-aura-border">
  <nav className="p-4">
    {menuItems.map((item) => (
      <button
        key={item.id}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium',
          'transition-all duration-200',
          isActive
            ? 'bg-primary-500/20 text-primary-400 shadow-glow-primary'
            : 'text-text-secondary hover:bg-aura-hover hover:text-text-primary'
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
      </button>
    ))}
  </nav>
</div>
```

### 5. Update Forms

```tsx
// Input field with Aura dark theme
<div className="space-y-2">
  <label className="block text-sm font-medium text-text-primary">
    Email Address
  </label>
  <input
    type="email"
    className={cn(
      'w-full px-4 py-2.5 rounded-lg',
      'bg-aura-card border border-aura-border',
      'text-text-primary placeholder:text-text-muted',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'transition-all duration-200'
    )}
    placeholder="you@example.com"
  />
</div>
```

## 🎨 Color Usage Guide

### Background Colors
```tsx
// Main background
<div className="bg-aura-bg">

// Surface level (cards, panels)
<div className="bg-aura-surface">

// Card background
<div className="bg-aura-card">

// Hover states
<div className="hover:bg-aura-hover">
```

### Text Colors
```tsx
// Primary text (headings, important content)
<h1 className="text-text-primary">

// Secondary text (body text)
<p className="text-text-secondary">

// Muted text (meta information)
<span className="text-text-muted">

// Disabled text
<span className="text-text-disabled">
```

### Semantic Colors
```tsx
// Success (green)
<div className="bg-success-500 text-white">
<div className="text-success-400"> {/* For dark bg */}

// Danger (red)
<div className="bg-danger-500 text-white">
<div className="text-danger-400"> {/* For dark bg */}

// Warning (amber)
<div className="bg-warning-500 text-white">
<div className="text-warning-400"> {/* For dark bg */}

// Info (cyan)
<div className="bg-info-500 text-white">
<div className="text-info-400"> {/* For dark bg */}

// Primary (blue)
<div className="bg-primary-500 text-white">
<div className="text-primary-400"> {/* For dark bg */}
```

### Glow Effects
```tsx
// Add subtle glow to important elements
<Card className="shadow-glow-primary">
<Button className="shadow-glow-success">
<div className="shadow-glow-danger">
```

## 📊 Chart Color Updates

Update Recharts color schemes:

```tsx
// Before
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// After - Brighter for dark background
const CHART_COLORS = [
  'rgb(59 130 246)',    // primary-500
  'rgb(16 185 129)',    // success-500
  'rgb(245 158 11)',    // warning-500
  'rgb(239 68 68)',     // danger-500
  'rgb(139 92 246)',    // accent-500
  'rgb(6 182 212)',     // info-500
];

// Update chart components
<AreaChart data={data}>
  <defs>
    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity={0.25} />
      <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity={0} />
    </linearGradient>
  </defs>
  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
  <XAxis stroke="#94A3B8" fontSize={11} />
  <YAxis stroke="#94A3B8" fontSize={11} />
  <Tooltip
    contentStyle={{
      background: 'rgba(21, 29, 46, 0.95)',
      border: '1px solid #1E293B',
      borderRadius: '8px',
      backdropFilter: 'blur(8px)',
    }}
  />
  <Area
    type="monotone"
    dataKey="revenue"
    stroke="rgb(59 130 246)"
    fill="url(#colorRevenue)"
    strokeWidth={2.5}
  />
</AreaChart>
```

## 🧪 Testing Checklist

- [ ] All pages render correctly with dark background
- [ ] Text is readable (good contrast)
- [ ] Forms are visible and functional
- [ ] Charts display properly
- [ ] Buttons have correct hover states
- [ ] Modals/dialogs have proper backdrop
- [ ] Tables are readable
- [ ] Navigation is clear
- [ ] Cards have proper depth (shadows)
- [ ] Loading states are visible
- [ ] Error states are noticeable
- [ ] Success states are clear
- [ ] Mobile responsive
- [ ] Accessibility maintained (contrast ratios)

## 🚀 Quick Migration Script

Create a file `scripts/migrate-to-dark-theme.sh`:

```bash
#!/bin/bash

echo "🌙 Migrating nu-aura to Dark Theme..."

# Step 1: Backup
echo "📦 Creating backups..."
cp frontend/tailwind.config.js frontend/tailwind.config.light.backup.js
cp frontend/app/layout.tsx frontend/app/layout.light.backup.tsx
cp frontend/app/globals.css frontend/app/globals.light.backup.css

# Step 2: Replace configs
echo "🔄 Updating configurations..."
cp frontend/tailwind.config.aura-dark.js frontend/tailwind.config.js
cp frontend/app/layout.aura-dark.tsx frontend/app/layout.tsx
cp frontend/app/globals.aura-dark.css frontend/app/globals.css

# Step 3: Install fonts
echo "📝 Fonts will be loaded via Next.js optimization..."

echo "✅ Migration complete!"
echo "🔥 Run 'npm run dev' to see the dark theme in action"
echo "📋 Review AURA_DARK_THEME_MIGRATION_GUIDE.md for component updates"
```

Run with:
```bash
chmod +x scripts/migrate-to-dark-theme.sh
./scripts/migrate-to-dark-theme.sh
```

## 🎯 Progressive Migration Strategy

If you want to migrate gradually:

### Phase 1: Core UI (Week 1)
- [ ] Update root layout
- [ ] Update global CSS
- [ ] Update Card component
- [ ] Update Button component
- [ ] Update Input components

### Phase 2: Navigation (Week 2)
- [ ] Update Sidebar
- [ ] Update Header
- [ ] Update Breadcrumbs
- [ ] Update Mobile navigation

### Phase 3: Pages (Week 3-4)
- [ ] Update Dashboard pages
- [ ] Update Employee pages
- [ ] Update Settings pages
- [ ] Update Report pages

### Phase 4: Charts & Analytics (Week 5)
- [ ] Update all chart components
- [ ] Update analytics dashboards
- [ ] Update KPI displays

### Phase 5: Polish (Week 6)
- [ ] Add loading animations
- [ ] Add micro-interactions
- [ ] Add glow effects
- [ ] Performance optimization

## 🐛 Common Issues & Solutions

### Issue 1: Text not visible
**Problem:** Text appears black on dark background

**Solution:**
```tsx
// Replace
className="text-gray-900"

// With
className="text-text-primary"
```

### Issue 2: Cards blend into background
**Problem:** Cards have same color as background

**Solution:**
```tsx
// Use proper card background
<Card className="bg-aura-card border border-aura-border shadow-card">
```

### Issue 3: Charts hard to read
**Problem:** Chart gridlines/text too dark

**Solution:**
```tsx
// Update chart styling
<CartesianGrid stroke="#1E293B" />
<XAxis stroke="#94A3B8" />
<YAxis stroke="#94A3B8" />
```

### Issue 4: Hover states not visible
**Problem:** Hover effects don't show

**Solution:**
```tsx
// Use proper hover colors
className="hover:bg-aura-hover hover:text-text-primary"
```

## 📚 Resources

- [Tailwind CSS Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
- [Next.js Font Optimization](https://nextjs.org/docs/basic-features/font-optimization)
- [Recharts Documentation](https://recharts.org/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 🎉 Success!

Once migration is complete, your nu-aura HRMS will have:

✨ Modern, executive-grade dark theme
✨ Consistent design language
✨ Better readability and contrast
✨ Professional aesthetics
✨ Optimized performance
✨ Enhanced user experience

---

**Need help?** Check the comparison examples in the migration files or reach out to your team lead.

# Compact Design System Guide

## Overview
This guide explains how to apply the new compact, modern design system across all pages in the application. The design is inspired by Keka's clean and space-efficient interface.

## Quick Start

### 1. Import the Theme
```typescript
import { compactTheme } from '@/styles/compact-theme';
```

### 2. Apply Page Layout
```typescript
<AppLayout activeMenuItem="your-menu-item">
  <div className={`${compactTheme.spacing.page} max-w-[1600px] mx-auto ${compactTheme.spacing.sectionGap}`}>
    {/* Your content */}
  </div>
</AppLayout>
```

## Design Principles

### Spacing
- **Page Padding**: `p-4 md:p-5 lg:p-6` - Responsive padding that's tighter on mobile
- **Section Gaps**: `space-y-4` - Consistent vertical spacing between sections
- **Card Gaps**: `gap-4` - Standard gap between grid items
- **Card Padding**: `p-4` - Internal card padding (reduced from p-6)

### Typography
| Element | Class | Usage |
|---------|-------|-------|
| Page Title | `text-2xl font-bold` | Main page heading |
| Card Title | `text-base font-bold` | Card/section heading |
| Section Title | `text-lg font-bold` | Sub-section heading |
| Label | `text-xs font-medium` | Form labels, descriptions |
| Small Label | `text-[10px] font-semibold uppercase tracking-wider` | Tiny labels in stat cards |
| Body | `text-sm` | Regular text |
| Small Body | `text-xs` | Supporting text |
| Large Stat | `text-2xl font-bold tabular-nums` | Primary metrics |
| Medium Stat | `text-xl font-bold tabular-nums` | Secondary metrics |

### Icons
| Size | Class | Usage |
|------|-------|-------|
| Page Header | `h-8 w-8` | Header icon |
| Card Header | `h-8 w-8` | Card title icon |
| Card Icon | `h-4 w-4` | Small icons in cards |
| Medium Icon | `h-5 w-5` | Action buttons |
| Stat Icon | `h-8 w-8` | Stat card icons |
| Small Stat Icon | `h-7 w-7` | Compact stat icons |

### Buttons
```typescript
// Primary action (was h-14, now h-12)
<Button className="h-12 px-6 text-base font-semibold rounded-xl">

// Secondary action
<Button className="h-10 px-4 text-sm font-semibold rounded-lg">

// Small button
<Button className="h-8 px-3 text-xs font-medium rounded-md">
```

## Component Patterns

### 1. Page Header
```typescript
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div>
    <div className="flex items-center gap-2 mb-1">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Page Title</h1>
    </div>
    <p className="text-surface-600 dark:text-surface-400 text-xs ml-10">
      Page description
    </p>
  </div>
</div>
```

### 2. Stat Card (Compact)
```typescript
<Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:shadow-lg transition-shadow">
  <CardContent className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
        Label
      </p>
    </div>
    <p className="text-2xl font-bold text-surface-900 dark:text-white tabular-nums">
      125
    </p>
    <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1">
      Description
    </p>
  </CardContent>
</Card>
```

### 3. Action Card (Quick Links)
```typescript
<Link href="/path" className="block group">
  <Card className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
      </div>
      <h3 className="text-base font-bold text-surface-900 dark:text-white mb-0.5">Card Title</h3>
      <p className="text-xs text-surface-600 dark:text-surface-400">Description</p>
    </CardContent>
  </Card>
</Link>
```

### 4. Chart Card
```typescript
<Card className="lg:col-span-2 border-0 shadow-md hover:shadow-lg transition-shadow">
  <CardHeader className="border-b border-surface-200 dark:border-surface-700 pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-base">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        Chart Title
      </CardTitle>
      <div className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
        <Calendar className="h-3.5 w-3.5" />
        Time Range
      </div>
    </div>
  </CardHeader>
  <CardContent className="pt-4 h-[280px]">
    {/* Chart content */}
  </CardContent>
</Card>
```

### 5. Table (Compact)
```typescript
<table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
  <thead className="bg-surface-50 dark:bg-surface-800">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300">
        Column
      </th>
    </tr>
  </thead>
  <tbody className="bg-white dark:bg-surface-900 divide-y divide-surface-200 dark:divide-surface-800">
    <tr className="hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
      <td className="px-4 py-3 text-sm text-surface-900 dark:text-white">
        Content
      </td>
    </tr>
  </tbody>
</table>
```

### 6. Form Input (Compact)
```typescript
<div className="space-y-1.5">
  <label className="text-xs font-medium text-surface-700 dark:text-surface-300">
    Label
  </label>
  <input
    className="h-10 w-full px-3 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 focus:ring-2 focus:ring-indigo-500"
    placeholder="Placeholder"
  />
</div>
```

## Color Gradients

### Icon/Badge Gradients
```typescript
compactTheme.gradients = {
  primary: 'from-indigo-500 to-purple-600',
  success: 'from-emerald-500 to-teal-600',
  warning: 'from-amber-500 to-orange-600',
  danger: 'from-rose-500 to-pink-600',
  info: 'from-blue-500 to-cyan-600',
  purple: 'from-purple-500 to-pink-600',
}
```

### Background Gradients
```typescript
compactTheme.bgGradients = {
  primary: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20',
  success: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
  warning: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
  danger: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
  info: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
  purple: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
  slate: 'from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800',
}
```

## Migration Checklist

### From Old Design to Compact
- [ ] Change page padding from `p-6 md:p-8` to `p-4 md:p-5 lg:p-6`
- [ ] Change section gaps from `space-y-6` to `space-y-4`
- [ ] Change grid gaps from `gap-6` to `gap-4` or `gap-3`
- [ ] Change card padding from `p-6` to `p-4`
- [ ] Change card padding small from `p-4` to `p-3`
- [ ] Reduce page title from `text-3xl` to `text-2xl`
- [ ] Reduce card titles from `text-xl` to `text-base`
- [ ] Reduce stat values from `text-3xl` to `text-2xl`
- [ ] Reduce icons from `h-10 w-10` to `h-8 w-8`
- [ ] Reduce card icons from `h-6 w-6` to `h-4 w-4` or `h-5 w-5`
- [ ] Reduce button heights from `h-14` to `h-12` (primary) or `h-10` (secondary)
- [ ] Change chart height from `h-[360px]` to `h-[280px]`
- [ ] Change table cell padding from `px-6 py-4` to `px-4 py-3`
- [ ] Change form input heights from `h-12` to `h-10`
- [ ] Change hover translate from `hover:-translate-y-1` to `hover:-translate-y-0.5`

## Example: Before vs After

### Before (Large)
```typescript
<div className="p-6 md:p-8 space-y-6">
  <h1 className="text-3xl font-bold">Page Title</h1>
  <Card>
    <CardContent className="p-6">
      <div className="h-12 w-12">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-3xl font-bold">125</p>
    </CardContent>
  </Card>
</div>
```

### After (Compact)
```typescript
<div className="p-4 md:p-5 lg:p-6 space-y-4">
  <h1 className="text-2xl font-bold">Page Title</h1>
  <Card>
    <CardContent className="p-4">
      <div className="h-8 w-8">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">125</p>
    </CardContent>
  </Card>
</div>
```

## Benefits

1. **Better Information Density**: More content visible without scrolling
2. **Faster Scanning**: Reduced visual clutter makes it easier to find information
3. **Modern Aesthetic**: Clean, professional look similar to Keka
4. **Consistent Experience**: Unified spacing and sizing across all pages
5. **Mobile Friendly**: Responsive design that works better on smaller screens
6. **Performance**: Less DOM elements and simpler styles

## Reference Implementation

See `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/app/attendance/page.tsx` for a complete example of the compact design system in action.

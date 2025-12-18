# HRMS Layout Components

A modern, professional layout system for the HRMS platform with responsive design, dark mode support, and smooth animations.

## Components Overview

### 1. **DarkModeProvider.tsx**

Context provider for managing dark mode theme across the application.

**Features:**
- System preference detection
- LocalStorage persistence
- Easy-to-use hook (`useDarkMode`)
- Automatic document class management

**Usage:**
```tsx
import { DarkModeProvider, useDarkMode } from '@/components/layout';

// Wrap your app
<DarkModeProvider>
  <YourApp />
</DarkModeProvider>

// Use in components
const { isDark, toggleDarkMode, setDarkMode } = useDarkMode();
```

**Hook Methods:**
- `isDark: boolean` - Current dark mode state
- `toggleDarkMode(): void` - Toggle dark mode on/off
- `setDarkMode(isDark: boolean): void` - Set specific dark mode state

---

### 2. **Breadcrumbs.tsx**

Navigation breadcrumb component for showing page hierarchy.

**Features:**
- Animated breadcrumb items
- Icon support
- Customizable separator
- Responsive design
- Home button with icon

**Props:**
```tsx
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}
```

**Usage:**
```tsx
import { Breadcrumbs } from '@/components/layout';
import { Users } from 'lucide-react';

<Breadcrumbs
  items={[
    { label: 'Employees', href: '/employees', icon: <Users /> },
    { label: 'John Doe' }
  ]}
/>
```

---

### 3. **Header.tsx**

Top navigation bar with branding, search, notifications, theme toggle, and user menu.

**Features:**
- Logo/branding section
- Search bar (hidden on mobile)
- Theme toggle (light/dark)
- Notification bell with badge
- User avatar with dropdown menu
- Responsive design with mobile menu toggle
- Smooth animations with Framer Motion

**Props:**
```tsx
interface HeaderProps {
  onMenuClick?: () => void;           // Mobile menu toggle handler
  showMenuButton?: boolean;            // Show mobile menu button
  userName?: string;                   // User display name
  userAvatar?: string;                 // Avatar image URL
  notificationCount?: number;          // Notification badge count
  onLogout?: () => void;              // Logout handler
  onProfile?: () => void;             // Profile click handler
  onSettings?: () => void;            // Settings click handler
  className?: string;                  // Custom styling
}
```

**Usage:**
```tsx
import { Header } from '@/components/layout';

<Header
  userName="John Doe"
  notificationCount={3}
  onLogout={() => router.push('/login')}
  onProfile={() => router.push('/profile')}
  onSettings={() => router.push('/settings')}
/>
```

**Features:**
- **Logo Section:** Displays "HRMS Platform" branding with gradient icon
- **Search Bar:** Searchable employees and documents (hidden on mobile)
- **Theme Toggle:** Sun/Moon icon to switch between light and dark modes
- **Notifications:** Bell icon with red badge showing notification count
- **User Menu:** Dropdown with Profile, Settings, and Logout options
- **Mobile Responsive:** Hamburger menu button for small screens

---

### 4. **AppLayout.tsx**

Main application layout wrapper combining all layout components.

**Features:**
- Responsive sidebar navigation (collapsible on desktop)
- Sliding mobile sidebar
- Top header with all controls
- Breadcrumb navigation (optional)
- Page content area with animations
- HRMS module navigation items
- Dark mode support throughout

**Navigation Items Included:**
- Dashboard
- Employees
- Departments
- Attendance
- Leave Management
- Performance
- Projects
- Payroll
- Organization Chart

**Props:**
```tsx
interface AppLayoutProps {
  children: React.ReactNode;                          // Page content
  breadcrumbs?: BreadcrumbItem[];                    // Breadcrumb items
  headerProps?: Partial<HeaderProps>;                // Header component props
  className?: string;                                 // Custom styling
  showBreadcrumbs?: boolean;                         // Show/hide breadcrumbs
  sidebarCollapsed?: boolean;                        // Initial sidebar state
  onSidebarCollapsedChange?: (collapsed: boolean) => void;  // Sidebar toggle
  activeMenuItem?: string;                           // Active menu item ID
  onMenuItemClick?: (item: SidebarItem) => void;    // Menu item click handler
}
```

**Usage:**
```tsx
import { AppLayout } from '@/components/layout';

<AppLayout
  activeMenuItem="employees"
  breadcrumbs={[
    { label: 'Employees', href: '/employees' },
    { label: 'John Doe' }
  ]}
  headerProps={{
    userName: 'John Doe',
    notificationCount: 5,
    onLogout: () => console.log('Logout')
  }}
>
  <YourPageContent />
</AppLayout>
```

**Features:**
- **Responsive Layout:** Desktop sidebar (collapsible), mobile slide-out menu
- **Smooth Animations:** Framer Motion transitions for sidebar and content
- **Breadcrumb Support:** Optional breadcrumb navigation showing page hierarchy
- **Page Transitions:** Animated fade-in/slide-in of content
- **HRMS Navigation:** Complete menu with all HRMS modules and icons

---

## Complete Example

```tsx
'use client';

import { useState } from 'react';
import { AppLayout, DarkModeProvider } from '@/components/layout';
import { Users } from 'lucide-react';

export default function EmployeesPage() {
  const [activeMenu, setActiveMenu] = useState('employees');

  return (
    <AppLayout
      activeMenuItem={activeMenu}
      onMenuItemClick={(item) => setActiveMenu(item.id)}
      breadcrumbs={[
        { label: 'Employees', href: '/employees', icon: <Users /> },
      ]}
      headerProps={{
        userName: 'John Doe',
        userAvatar: '/avatar.jpg',
        notificationCount: 3,
        onLogout: () => window.location.href = '/login',
      }}
      showBreadcrumbs={true}
    >
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Employees</h1>
        {/* Your page content here */}
      </div>
    </AppLayout>
  );
}
```

---

## Styling & Customization

All components use:
- **Tailwind CSS** for styling
- **Dark mode** support via `dark:` prefix
- **Framer Motion** for animations
- **Lucide React** icons
- **CVA** (class-variance-authority) for component variants

### Custom Styling

Use the `className` prop to add custom styles:

```tsx
<AppLayout
  className="custom-app-layout"
  breadcrumbs={[...]}
>
  {/* Content */}
</AppLayout>
```

### Dark Mode

Components automatically respond to dark mode:

```tsx
import { useDarkMode } from '@/components/layout';

function MyComponent() {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <button onClick={toggleDarkMode}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

---

## Responsive Breakpoints

- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md)
- **Desktop:** > 1024px (lg)

### Responsive Behavior

- **Header:** Always visible, responsive search bar
- **Sidebar:** Hidden on mobile, slide-out overlay with menu button
- **Breadcrumbs:** "Home" text hidden on mobile, icon always shown
- **Navigation Items:** Full text on desktop, icons only when collapsed

---

## Animation Details

### Sidebar Collapse
- Type: Spring animation
- Stiffness: 200
- Damping: 30
- Smooth width transition between 80px and 256px

### Mobile Sidebar
- Type: Spring animation
- Slide in from left
- Backdrop overlay with fade animation

### Content Page
- Fade in with slight upward slide
- Duration: 300ms
- Smooth transitions between pages

---

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support (built into Sidebar)
- Color contrast compliant
- Focus states on interactive elements

---

## Dependencies

- `react` - UI library
- `next` - Framework
- `framer-motion` - Animations
- `lucide-react` - Icons
- `tailwindcss` - Styling
- `class-variance-authority` - Component variants

---

## File Structure

```
components/layout/
├── AppLayout.tsx          # Main layout wrapper
├── Header.tsx             # Top navigation bar
├── Breadcrumbs.tsx        # Navigation breadcrumbs
├── DarkModeProvider.tsx   # Dark mode context
├── index.ts              # Barrel export
└── README.md             # This file
```

---

## Tips & Best Practices

1. **Always wrap with DarkModeProvider** at the root level (already done in AppLayout)
2. **Use breadcrumbs** to help users understand page hierarchy
3. **Set activeMenuItem** to match current page for visual feedback
4. **Provide header props** for user information and actions
5. **Handle onMenuItemClick** to navigate or update state
6. **Test dark mode** to ensure content is readable
7. **Use lazy loading** for heavy content in the main area

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## License

Part of HRMS Platform - All rights reserved

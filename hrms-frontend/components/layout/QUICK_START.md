# Layout Components - Quick Start Guide

## 30-Second Setup

### 1. Wrap Your App
```tsx
import { DarkModeProvider } from '@/components/layout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DarkModeProvider>
      {children}
    </DarkModeProvider>
  );
}
```

### 2. Use AppLayout in Pages
```tsx
'use client';

import { AppLayout } from '@/components/layout';

export default function EmployeesPage() {
  return (
    <AppLayout
      activeMenuItem="employees"
      breadcrumbs={[
        { label: 'Employees', href: '/employees' }
      ]}
      headerProps={{
        userName: 'John Doe',
        notificationCount: 3,
      }}
    >
      <h1>Your Content Here</h1>
    </AppLayout>
  );
}
```

Done! You now have:
- Responsive layout with sidebar
- Mobile-friendly design
- Dark mode support
- Header with user menu
- Breadcrumb navigation

---

## Common Tasks

### Show Notifications
```tsx
<AppLayout
  headerProps={{
    notificationCount: 5
  }}
>
  {/* content */}
</AppLayout>
```

### Handle Logout
```tsx
<AppLayout
  headerProps={{
    onLogout: () => router.push('/login')
  }}
>
  {/* content */}
</AppLayout>
```

### Display User Avatar
```tsx
<AppLayout
  headerProps={{
    userName: 'John Doe',
    userAvatar: '/avatars/john.jpg'
  }}
>
  {/* content */}
</AppLayout>
```

### Change Active Menu Item
```tsx
const [activeMenu, setActiveMenu] = useState('employees');

<AppLayout
  activeMenuItem={activeMenu}
  onMenuItemClick={(item) => setActiveMenu(item.id)}
>
  {/* content */}
</AppLayout>
```

### Add Breadcrumbs
```tsx
<AppLayout
  breadcrumbs={[
    { label: 'Employees', href: '/employees' },
    { label: 'Details', href: '/employees/123' },
    { label: 'Edit' }
  ]}
  showBreadcrumbs={true}
>
  {/* content */}
</AppLayout>
```

### Toggle Dark Mode
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

## Available Menu Items

The AppLayout includes these HRMS modules by default:

| Item ID | Label | Icon | Route |
|---------|-------|------|-------|
| dashboard | Dashboard | LayoutDashboard | /dashboard |
| employees | Employees | Users | /employees |
| departments | Departments | Building2 | /departments |
| attendance | Attendance | Clock | /attendance |
| leave | Leave Management | FileText | /leave |
| performance | Performance | BarChart3 | /performance |
| projects | Projects | Briefcase | /projects |
| payroll | Payroll | DollarSign | /payroll |
| org-chart | Organization Chart | GitBranch | /organization-chart |

---

## Props Reference

### AppLayout Props
```tsx
{
  children: React.ReactNode;           // Required: Page content
  activeMenuItem?: string;              // Highlight this menu item
  breadcrumbs?: BreadcrumbItem[];       // Show breadcrumbs
  showBreadcrumbs?: boolean;            // Enable/disable breadcrumbs
  headerProps?: {
    userName?: string;                  // User display name
    userAvatar?: string;                // Avatar image URL
    notificationCount?: number;         // Badge count
    onLogout?: () => void;              // Logout handler
    onProfile?: () => void;             // Profile click
    onSettings?: () => void;            // Settings click
  };
  onMenuItemClick?: (item) => void;     // Menu item handler
  onSidebarCollapsedChange?: () => void; // Sidebar toggle
}
```

### Breadcrumb Items
```tsx
{
  label: string;        // Display text
  href?: string;        // Optional link
  icon?: ReactNode;     // Optional icon
}
```

---

## Responsive Breakpoints

| Screen Size | Behavior |
|------------|----------|
| < 640px | Mobile sidebar overlay, hidden search |
| 640-1024px | Desktop sidebar, visible search |
| > 1024px | Full desktop layout |

---

## Import Paths

```tsx
// Import layout
import { AppLayout } from '@/components/layout';

// Import header
import { Header } from '@/components/layout';

// Import breadcrumbs
import { Breadcrumbs } from '@/components/layout';

// Import dark mode
import { DarkModeProvider, useDarkMode } from '@/components/layout';

// Import all
import {
  AppLayout,
  Header,
  Breadcrumbs,
  DarkModeProvider,
  useDarkMode
} from '@/components/layout';
```

---

## Full Example

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { Users, FileText } from 'lucide-react';

export default function EmployeesPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('employees');

  return (
    <AppLayout
      activeMenuItem={activeMenu}
      onMenuItemClick={(item) => {
        setActiveMenu(item.id);
        if (item.href) {
          router.push(item.href);
        }
      }}
      breadcrumbs={[
        { label: 'Employees', href: '/employees', icon: <Users /> }
      ]}
      showBreadcrumbs={true}
      headerProps={{
        userName: 'John Doe',
        userAvatar: '/avatars/john.jpg',
        notificationCount: 5,
        onLogout: async () => {
          // Handle logout
          router.push('/login');
        },
        onProfile: () => {
          router.push('/profile');
        },
        onSettings: () => {
          router.push('/settings');
        }
      }}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Employees</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Add Employee
          </button>
        </div>

        {/* Your page content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Content goes here */}
        </div>
      </div>
    </AppLayout>
  );
}
```

---

## Troubleshooting

### Dark mode not working?
- Ensure `DarkModeProvider` wraps your entire app
- Check localStorage for 'darkMode' key
- Verify `dark:` Tailwind classes in your components

### Sidebar not showing menu?
- Confirm `menuItems` are passed to AppLayout
- Set `activeMenuItem` prop to highlight current page
- Check console for JavaScript errors

### Mobile menu not working?
- Ensure parent div has `overflow-hidden` (AppLayout does this)
- Test on actual mobile device, not just browser dev tools
- Check z-index conflicts with other components

### Navigation not working?
- Set `onMenuItemClick` handler to update `activeMenuItem`
- Use `router.push()` to navigate to page
- Confirm href values are correct

---

## Animation Customization

### Sidebar Collapse Speed
Currently set to spring animation with stiffness: 200, damping: 30

Edit `AppLayout.tsx` line 161 to adjust:
```tsx
// Change from:
transition={{ type: 'spring', stiffness: 200, damping: 30 }}

// To:
transition={{ type: 'spring', stiffness: 100, damping: 20 }}  // Slower
transition={{ type: 'spring', stiffness: 300, damping: 40 }}  // Faster
```

---

## Component Files

| File | Size | Purpose |
|------|------|---------|
| DarkModeProvider.tsx | 2.0K | Theme management |
| Breadcrumbs.tsx | 2.5K | Navigation breadcrumbs |
| Header.tsx | 9.6K | Top navigation |
| AppLayout.tsx | 5.4K | Main layout wrapper |
| index.ts | 339B | Barrel exports |
| README.md | 8.9K | Full documentation |

---

## Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. Customize colors and styles for your brand
3. Add your company logo to the header
4. Set up navigation handlers for your pages
5. Test dark mode and responsive design

---

**Need Help?** Check `README.md` for comprehensive documentation.

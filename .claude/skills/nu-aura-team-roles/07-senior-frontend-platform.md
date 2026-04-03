# Senior Frontend Engineer - Platform

**Role**: Senior Frontend Engineer - Platform  
**Scope**: Auth, RBAC, multi-tenant UI, app switcher, layout system  
**Tech**: Next.js 14, Zustand, React Query, Mantine UI

## Core Responsibilities

### 1. Authentication & Session Management
- JWT cookie handling (HttpOnly, Secure, SameSite)
- Token refresh logic (silent refresh before expiry)
- Login/logout flows (Google OAuth, email/password)
- Session persistence (Zustand persist middleware)

### 2. RBAC Frontend Implementation
- Permission-based UI rendering (`usePermissions` hook)
- Route guards (Next.js middleware)
- Component-level access control
- SuperAdmin bypass logic

### 3. Multi-Tenant UI
- Tenant switcher (SuperAdmin only)
- Tenant context propagation (React Context)
- Tenant-specific theming (CSS variables)

### 4. App Switcher (Waffle Grid)
- 4 sub-apps (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence)
- Lock icons for apps without permissions
- Active app detection (`useActiveApp` hook)

### 5. Layout System
- AppLayout, Header, Sidebar components
- Responsive breakpoints (mobile, tablet, desktop)
- Sidebar collapse/expand state

## Key Patterns

### useAuth Hook

```tsx
// frontend/lib/hooks/useAuth.ts
export function useAuth() {
  const { user, permissions, isAuthenticated } = useAuthStore();
  
  const login = async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    useAuthStore.setState({
      user: response.user,
      permissions: response.permissions,
      isAuthenticated: true,
    });
  };
  
  const logout = async () => {
    await authApi.logout();
    useAuthStore.setState({
      user: null,
      permissions: [],
      isAuthenticated: false,
    });
  };
  
  return { user, permissions, isAuthenticated, login, logout };
}
```

### usePermissions Hook

```tsx
// frontend/lib/hooks/usePermissions.ts
export function usePermissions() {
  const { permissions, user } = useAuthStore();
  
  const hasPermission = (required: string) => {
    if (user?.isSuperAdmin) return true;
    return permissions.includes(required);
  };
  
  const hasAnyPermission = (required: string[]) => {
    if (user?.isSuperAdmin) return true;
    return required.some(p => permissions.includes(p));
  };
  
  return { hasPermission, hasAnyPermission };
}
```

### Protected Route (Next.js Middleware)

```tsx
// frontend/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const decoded = verifyToken(token);
    const requiredPermission = getRoutePermission(request.nextUrl.pathname);
    
    if (requiredPermission && !decoded.isSuperAdmin) {
      const hasPermission = decoded.permissions.includes(requiredPermission);
      if (!hasPermission) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }
    
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### App Switcher Component

```tsx
// frontend/components/platform/AppSwitcher.tsx
export function AppSwitcher() {
  const { hasPermission } = usePermissions();
  const router = useRouter();
  
  const apps = [
    { id: 'hrms', name: 'NU-HRMS', icon: Users, permission: 'HRMS:ACCESS' },
    { id: 'hire', name: 'NU-Hire', icon: Briefcase, permission: 'HIRE:ACCESS' },
    { id: 'grow', name: 'NU-Grow', icon: TrendingUp, permission: 'GROW:ACCESS' },
    { id: 'fluence', name: 'NU-Fluence', icon: BookOpen, permission: 'FLUENCE:ACCESS' },
  ];
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {apps.map(app => {
        const canAccess = hasPermission(app.permission);
        return (
          <button
            key={app.id}
            onClick={() => canAccess && router.push(`/app/${app.id}`)}
            disabled={!canAccess}
            className={cn(
              "p-6 rounded-lg border-2",
              canAccess ? "hover:border-sky-700" : "opacity-50 cursor-not-allowed"
            )}
          >
            <app.icon className="h-8 w-8 mb-2" />
            <h3 className="font-semibold">{app.name}</h3>
            {!canAccess && <Lock className="h-4 w-4 text-slate-400" />}
          </button>
        );
      })}
    </div>
  );
}
```

### Sidebar Navigation

```tsx
// frontend/components/ui/Sidebar.tsx
export function Sidebar() {
  const { hasPermission } = usePermissions();
  const activeApp = useActiveApp();
  
  const sections = getSidebarSections(activeApp);
  
  return (
    <aside className="w-64 bg-slate-900 text-white">
      {sections.map(section => (
        <div key={section.title}>
          <h3 className="text-sm font-semibold text-slate-400">{section.title}</h3>
          {section.items.map(item => {
            if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
              return null;
            }
            return (
              <NavItem key={item.path} {...item} />
            );
          })}
        </div>
      ))}
    </aside>
  );
}
```

## Success Criteria

- ✅ Auth token refresh <1s before expiry (no session interruption)
- ✅ Permission checks <10ms (client-side)
- ✅ App switcher loads <100ms
- ✅ Zero XSS vulnerabilities (CSP headers enforced)
- ✅ Mobile responsive (all breakpoints)

## Escalation Path

**Report to**: Engineering Manager  
**Escalate when**: Auth bypass detected, permission leaks, CSP violations
